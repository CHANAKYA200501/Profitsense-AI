import lightgbm as lgb
import pandas as pd
import numpy as np
import mlflow
import mlflow.lightgbm
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import roc_auc_score
import optuna

class EarningsSurprisePredictor:
    """
    Predicts probability of positive earnings surprise (>15% above consensus)
    Uses: pre-earnings price action, options data, analyst revision momentum
    
    Features: 45-day pre-earnings window price/volume behavior
    Target: EPS_actual / EPS_estimate > 1.15 (positive surprise >15%)
    """
    
    def build_pre_earnings_features(self, symbol: str, 
                                     earnings_date: pd.Timestamp,
                                     df_ohlcv: pd.DataFrame) -> dict:
        """
        Extract features from the 45-day window BEFORE earnings announcement.
        """
        # Get 45 days before earnings
        start = earnings_date - pd.Timedelta(days=60)
        end = earnings_date - pd.Timedelta(days=1)
        pre = df_ohlcv.loc[start:end].tail(45)
        
        if len(pre) < 20:
            return None
        
        close = pre['Close']
        volume = pre['Volume']
        
        features = {}
        
        # Price behavior in run-up
        features['pre_return_10d']  = close.iloc[-1] / close.iloc[-11] - 1
        features['pre_return_20d']  = close.iloc[-1] / close.iloc[-21] - 1
        features['pre_return_45d']  = close.iloc[-1] / close.iloc[0] - 1
        
        # Volume run-up (institutions accumulating ahead of results)
        features['vol_surge_5d']    = volume.iloc[-5:].mean() / volume.iloc[-45:-5].mean()
        features['vol_surge_2d']    = volume.iloc[-2:].mean() / volume.iloc[-45:-2].mean()
        features['vol_trend']       = np.polyfit(range(len(volume)), volume.values, 1)[0]
        
        # Volatility compression (market expects a move)
        features['vol_compression'] = close.pct_change().iloc[-10:].std() / \
                                       close.pct_change().iloc[-45:-10].std()
        
        # RSI momentum
        import pandas_ta as ta
        rsi = ta.rsi(close, length=14)
        features['rsi_pre_earnings'] = rsi.iloc[-1]
        features['rsi_trend_5d']     = rsi.iloc[-1] - rsi.iloc[-6]
        
        # Analyst revision momentum (from scraped data)
        # features['analyst_upgrades_30d'] = ... (from Trendlyne scrape)
        
        return features
    
    def train(self, X: pd.DataFrame, y: pd.Series):
        """Train LightGBM earnings surprise predictor"""
        mlflow.set_experiment("profitsense_earnings_predictor")
        
        params = {
            'objective': 'binary',
            'metric': 'auc',
            'learning_rate': 0.03,
            'num_leaves': 63,
            'max_depth': -1,
            'min_child_samples': 20,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'reg_alpha': 0.1,
            'reg_lambda': 0.1,
            'is_unbalance': True,
            'verbose': -1,
        }
        
        with mlflow.start_run():
            tscv = TimeSeriesSplit(n_splits=5, gap=90)  # 90-day gap for quarterly earnings
            aucs = []
            
            for fold, (tr_idx, val_idx) in enumerate(tscv.split(X)):
                train_data = lgb.Dataset(X.iloc[tr_idx], label=y.iloc[tr_idx])
                val_data   = lgb.Dataset(X.iloc[val_idx], label=y.iloc[val_idx])
                
                model = lgb.train(
                    params, train_data,
                    num_boost_round=1000,
                    valid_sets=[val_data],
                    callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)]
                )
                
                preds = model.predict(X.iloc[val_idx])
                auc = roc_auc_score(y.iloc[val_idx], preds)
                aucs.append(auc)
                print(f"  Fold {fold+1} AUC: {auc:.4f}")
            
            print(f"\nMean CV AUC: {np.mean(aucs):.4f}")
            mlflow.log_metric("cv_mean_auc", np.mean(aucs))
            
            # Final model
            final_model = lgb.train(
                params, 
                lgb.Dataset(X, label=y),
                num_boost_round=500
            )
            
            mlflow.lightgbm.log_model(final_model, "lgbm_earnings")
            final_model.save_model("ml_training/data/models/lgbm_earnings.txt")
            return final_model
