import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import pandas as pd
import mlflow
import mlflow.pytorch
from sklearn.preprocessing import MinMaxScaler

class StockPatternLSTM(nn.Module):
    """
    LSTM model that detects chart patterns from price/volume sequences.
    Input: 60-day normalized OHLCV window
    Output: Probability of bullish signal in next 30 days
    """
    
    def __init__(self, input_size: int = 10, 
                 hidden_size: int = 128,
                 num_layers: int = 3,
                 dropout: float = 0.3):
        super().__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # Bidirectional LSTM for pattern recognition
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
            batch_first=True,
            bidirectional=True  # Bidirectional for better pattern detection
        )
        
        # Attention mechanism (focus on most informative timesteps)
        self.attention = nn.Sequential(
            nn.Linear(hidden_size * 2, 64),
            nn.Tanh(),
            nn.Linear(64, 1),
            nn.Softmax(dim=1)
        )
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch_size, seq_len=60, input_size=10)
        lstm_out, _ = self.lstm(x)
        # lstm_out: (batch_size, seq_len, hidden_size*2)
        
        # Attention weights
        attn_weights = self.attention(lstm_out)  # (batch, seq, 1)
        context = (lstm_out * attn_weights).sum(dim=1)  # (batch, hidden*2)
        
        output = self.classifier(context)
        return output.squeeze(-1)


class LSTMTrainer:
    """Full training pipeline for LSTM pattern detector"""
    
    SEQUENCE_LEN = 60    # 60 trading days input window
    FORECAST_HORIZON = 30  # Predict 30 days ahead
    BATCH_SIZE = 256
    EPOCHS = 100
    LEARNING_RATE = 1e-3
    
    def build_sequences(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Build sliding-window sequences from OHLCV data"""
        features = self._extract_lstm_features(df)
        target = self._build_target(df)
        
        scaler = MinMaxScaler()
        features_scaled = scaler.fit_transform(features)
        
        X, y = [], []
        for i in range(self.SEQUENCE_LEN, len(features_scaled) - self.FORECAST_HORIZON):
            X.append(features_scaled[i-self.SEQUENCE_LEN:i])
            y.append(target.iloc[i])
        
        return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)
    
    def _extract_lstm_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """10 normalized features per timestep"""
        import pandas_ta as ta
        close, high, low, vol = df['Close'], df['High'], df['Low'], df['Volume']
        
        f = pd.DataFrame(index=df.index)
        f['ret_1d']     = close.pct_change()
        f['ret_5d']     = close.pct_change(5)
        f['high_ret']   = (high - close.shift(1)) / close.shift(1)
        f['low_ret']    = (low  - close.shift(1)) / close.shift(1)
        f['vol_ratio']  = vol / vol.rolling(20).mean()
        f['rsi']        = ta.rsi(close, 14) / 100  # normalize 0-1
        macd = ta.macd(close)
        f['macd_norm']  = macd['MACD_12_26_9'] / close  # normalize by price
        bb = ta.bbands(close, 20)
        f['bb_pct']     = (close - bb['BBL_20_2.0']) / (bb['BBU_20_2.0'] - bb['BBL_20_2.0'] + 1e-8)
        f['dist_200ma'] = (close - close.rolling(200).mean()) / close.rolling(200).mean()
        f['atr_pct']    = ta.atr(high, low, close, 14) / close
        
        return f.dropna()
    
    def _build_target(self, df: pd.DataFrame) -> pd.Series:
        close = df['Close']
        fwd_return = close.shift(-self.FORECAST_HORIZON) / close - 1
        return (fwd_return > 0.05).astype(int)  # 5% gain threshold
    
    def train(self, sequences_by_symbol: dict) -> StockPatternLSTM:
        """Train LSTM on all symbol sequences"""
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Training on: {device}")
        
        # Combine all sequences
        all_X = np.concatenate([v[0] for v in sequences_by_symbol.values()])
        all_y = np.concatenate([v[1] for v in sequences_by_symbol.values()])
        
        # Shuffle (safe for individual stock sequences)
        perm = np.random.permutation(len(all_X))
        all_X, all_y = all_X[perm], all_y[perm]
        
        split = int(0.85 * len(all_X))
        X_train = torch.FloatTensor(all_X[:split]).to(device)
        y_train = torch.FloatTensor(all_y[:split]).to(device)
        X_val   = torch.FloatTensor(all_X[split:]).to(device)
        y_val   = torch.FloatTensor(all_y[split:]).to(device)
        
        train_loader = DataLoader(
            TensorDataset(X_train, y_train),
            batch_size=self.BATCH_SIZE, shuffle=True
        )
        
        model = StockPatternLSTM(
            input_size=all_X.shape[2],  # 10 features
            hidden_size=128,
            num_layers=3,
            dropout=0.3
        ).to(device)
        
        # Class-weighted loss for imbalanced data
        pos_weight = torch.tensor([(all_y==0).sum() / (all_y==1).sum()]).to(device)
        criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
        
        optimizer = optim.AdamW(model.parameters(), 
                                 lr=self.LEARNING_RATE, 
                                 weight_decay=1e-4)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, patience=10, factor=0.5
        )
        
        mlflow.set_experiment("profitsense_lstm_pattern")
        
        with mlflow.start_run():
            best_val_loss = float('inf')
            patience_counter = 0
            
            for epoch in range(self.EPOCHS):
                # Training
                model.train()
                train_losses = []
                for X_batch, y_batch in train_loader:
                    optimizer.zero_grad()
                    pred = model(X_batch)
                    loss = criterion(pred, y_batch)
                    loss.backward()
                    nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                    optimizer.step()
                    train_losses.append(loss.item())
                
                # Validation
                model.eval()
                with torch.no_grad():
                    val_pred = model(X_val)
                    val_loss = criterion(val_pred, y_val).item()
                    
                    from sklearn.metrics import roc_auc_score
                    val_auc = roc_auc_score(
                        y_val.cpu().numpy(),
                        val_pred.cpu().numpy()
                    )
                
                scheduler.step(val_loss)
                
                mlflow.log_metrics({
                    "train_loss": np.mean(train_losses),
                    "val_loss": val_loss,
                    "val_auc": val_auc
                }, step=epoch)
                
                if epoch % 10 == 0:
                    print(f"Epoch {epoch:3d} | Train={np.mean(train_losses):.4f} "
                          f"| Val={val_loss:.4f} | AUC={val_auc:.4f}")
                
                # Early stopping
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    patience_counter = 0
                    torch.save(model.state_dict(), 
                               "ml_training/data/models/lstm_best.pt")
                else:
                    patience_counter += 1
                    if patience_counter >= 20:
                        print(f"Early stopping at epoch {epoch}")
                        break
            
            # Load best weights and log
            model.load_state_dict(torch.load("ml_training/data/models/lstm_best.pt"))
            mlflow.pytorch.log_model(model, "lstm_pattern_model")
            
            print(f"\nTraining complete. Best val loss: {best_val_loss:.4f}")
        
        return model
