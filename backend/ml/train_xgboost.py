import xgboost as xgb
import optuna
import mlflow
import mlflow.xgboost
import pandas as pd
import numpy as np
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import roc_auc_score, precision_score, recall_score
from sklearn.preprocessing import RobustScaler
import shap
import pickle
import json
from pathlib import Path

class XGBoostSignalTrainer:
    """
    Trains XGBoost model to predict: will this stock generate >3% alpha 
    vs Nifty 50 in the next 30 days?
    
    Uses Walk-Forward validation (time-series safe, no data leakage).
    """
    
    MODEL_PATH = Path("ml_training/data/models/xgb_signal_predictor.pkl")
    SCALER_PATH = Path("ml_training/data/models/feature_scaler.pkl")
    FEATURES_PATH = Path("ml_training/data/models/feature_names.json")
    
    NIFTY500_SYMBOLS = [
        "RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR", "ICICIBANK",
        "KOTAKBANK", "BHARTIARTL", "ITC", "AXISBANK", "BAJFINANCE", 
        "WIPRO", "ASIANPAINT", "MARUTI", "SUNPHARMA", "ULTRACEMCO",
        "TATAMOTORS", "TATASTEEL", "NESTLEIND", "POWERGRID",
        # ... sample ...
    ]
    
    def load_training_data(self, years: int = 5) -> tuple[pd.DataFrame, pd.Series]:
        """
        Download 5 years of data for all Nifty 500 stocks.
        Build feature matrix and target vector.
        """
        import yfinance as yf
        from .feature_engineering import FeatureEngineer
        
        eng = FeatureEngineer()
        all_features = []
        all_targets = []
        
        print(f"Loading data for {len(self.NIFTY500_SYMBOLS)} stocks...")
        
        for i, symbol in enumerate(self.NIFTY500_SYMBOLS):
            try:
                df = yf.download(f"{symbol}.NS", period=f"{years}y", 
                                  interval="1d", progress=False)
                if len(df) < 300:
                    continue
                
                features = eng.build_features(symbol, df)
                target = eng.build_target(symbol, df)
                
                # Align
                common_idx = features.index.intersection(target.index)
                features = features.loc[common_idx]
                target = target.loc[common_idx]
                
                # Add symbol and date as metadata (not features)
                features['_symbol'] = symbol
                features['_date'] = features.index
                
                all_features.append(features)
                all_targets.append(target.loc[common_idx])
                
                if i % 10 == 0:
                    print(f"  Processed {i}/{len(self.NIFTY500_SYMBOLS)} stocks")
                    
            except Exception as e:
                print(f"  Failed {symbol}: {e}")
                continue
        
        X = pd.concat(all_features, axis=0)
        y = pd.concat(all_targets, axis=0)
        
        # Remove metadata columns from features
        meta_cols = ['_symbol', '_date']
        feature_cols = [c for c in X.columns if c not in meta_cols]
        
        print(f"Training data shape: {X[feature_cols].shape}")
        print(f"Class balance: {y.mean():.3f} (fraction of positive examples)")
        
        return X[feature_cols], y, X[meta_cols]
    
    def optimize_hyperparams(self, X: pd.DataFrame, y: pd.Series, n_trials: int = 100) -> dict:
        """
        Optuna hyperparameter optimization with TimeSeriesSplit validation.
        """
        def objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 200, 2000),
                'max_depth': trial.suggest_int('max_depth', 3, 12),
                'learning_rate': trial.suggest_float('learning_rate', 0.005, 0.3, log=True),
                'subsample': trial.suggest_float('subsample', 0.5, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.3, 1.0),
                'min_child_weight': trial.suggest_int('min_child_weight', 1, 20),
                'reg_alpha': trial.suggest_float('reg_alpha', 1e-8, 10.0, log=True),
                'reg_lambda': trial.suggest_float('reg_lambda', 1e-8, 10.0, log=True),
                'gamma': trial.suggest_float('gamma', 0, 5),
                'scale_pos_weight': trial.suggest_float('scale_pos_weight', 1, 5),
                'tree_method': 'hist',
                'eval_metric': 'auc',
                'random_state': 42,
            }
            
            # Time-series cross-validation (5 folds)
            tscv = TimeSeriesSplit(n_splits=5, gap=30)  # 30-day gap (forward-return horizon)
            aucs = []
            
            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
                
                model = xgb.XGBClassifier(**params)
                model.fit(X_train, y_train, 
                         eval_set=[(X_val, y_val)],
                         early_stopping_rounds=50,
                         verbose=False)
                
                preds = model.predict_proba(X_val)[:, 1]
                aucs.append(roc_auc_score(y_val, preds))
            
            return np.mean(aucs)
        
        print(f"Running Optuna optimization ({n_trials} trials)...")
        study = optuna.create_study(direction='maximize', 
                                     study_name='xgb_signal_predictor')
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
        
        print(f"Best AUC: {study.best_value:.4f}")
        print(f"Best params: {study.best_params}")
        return study.best_params
    
    def train(self, X: pd.DataFrame, y: pd.Series, 
              hyperparams: dict = None, run_name: str = None) -> xgb.XGBClassifier:
        """
        Train final model on full dataset with MLflow tracking.
        """
        mlflow.set_experiment("profitsense_signal_predictor")
        
        with mlflow.start_run(run_name=run_name or f"xgb_{pd.Timestamp.now().strftime('%Y%m%d_%H%M')}"):
            
            # Scale features
            scaler = RobustScaler()
            X_scaled = pd.DataFrame(
                scaler.fit_transform(X), 
                columns=X.columns, 
                index=X.index
            )
            
            # Use best params or defaults
            params = hyperparams or {
                'n_estimators': 500,
                'max_depth': 6,
                'learning_rate': 0.05,
                'subsample': 0.8,
                'colsample_bytree': 0.7,
                'min_child_weight': 5,
                'reg_alpha': 0.1,
                'reg_lambda': 1.0,
                'scale_pos_weight': 2.0,
                'tree_method': 'hist',
                'random_state': 42,
            }
            
            # Final walk-forward evaluation
            tscv = TimeSeriesSplit(n_splits=5, gap=30)
            cv_aucs, cv_precisions = [], []
            
            for fold, (train_idx, val_idx) in enumerate(tscv.split(X_scaled)):
                X_tr, X_val = X_scaled.iloc[train_idx], X_scaled.iloc[val_idx]
                y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]
                
                fold_model = xgb.XGBClassifier(**params)
                fold_model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)],
                               early_stopping_rounds=50, verbose=False)
                
                preds_proba = fold_model.predict_proba(X_val)[:, 1]
                preds_binary = (preds_proba > 0.6).astype(int)  # high-precision threshold
                
                auc = roc_auc_score(y_val, preds_proba)
                prec = precision_score(y_val, preds_binary, zero_division=0)
                
                cv_aucs.append(auc)
                cv_precisions.append(prec)
                print(f"  Fold {fold+1}: AUC={auc:.4f}, Precision@0.6={prec:.4f}")
            
            mean_auc = np.mean(cv_aucs)
            mean_prec = np.mean(cv_precisions)
            
            mlflow.log_params(params)
            mlflow.log_metric("cv_mean_auc", mean_auc)
            mlflow.log_metric("cv_mean_precision_60", mean_prec)
            mlflow.log_metric("training_samples", len(X))
            mlflow.log_metric("feature_count", X.shape[1])
            
            print(f"\nCV Results: AUC={mean_auc:.4f}, Precision@0.6={mean_prec:.4f}")
            
            # Train FINAL model on ALL data
            final_model = xgb.XGBClassifier(**params)
            final_model.fit(X_scaled, y, verbose=False)
            
            # SHAP explainability
            explainer = shap.TreeExplainer(final_model)
            shap_values = explainer.shap_values(X_scaled.head(1000))
            
            # Top 10 most important features
            feature_importance = pd.DataFrame({
                'feature': X.columns,
                'importance': final_model.feature_importances_,
                'shap_mean_abs': np.abs(shap_values).mean(axis=0)
            }).sort_values('shap_mean_abs', ascending=False)
            
            print("\nTop 10 Features (SHAP):")
            for _, row in feature_importance.head(10).iterrows():
                print(f"  {row['feature']:<35} SHAP={row['shap_mean_abs']:.4f}")
            
            mlflow.log_dict(
                feature_importance.head(20).to_dict(), 
                "top_features.json"
            )
            mlflow.xgboost.log_model(final_model, "model")
            
            # Save artifacts
            self.MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            pickle.dump(final_model, open(self.MODEL_PATH, 'wb'))
            pickle.dump(scaler, open(self.SCALER_PATH, 'wb'))
            json.dump(list(X.columns), open(self.FEATURES_PATH, 'w'))
            
            print(f"\nModel saved to {self.MODEL_PATH}")
            return final_model
