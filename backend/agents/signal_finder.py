import pandas as pd
import yfinance as yf
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
from ml.ensemble import EnsemblePredictor
from data.nse_fetcher import NSEClient
from data.nse_fetcher import YFinanceClient
from ml.risk_management import RiskManager
from ml.feature_engineering import FeatureEngineer
from services.technical_rules import TechnicalRulesEngine
from services.pattern_detector import PatternDetector
import uuid
from datetime import datetime, timezone

# NIFTY 500 fallback universe (used when NSE API is unavailable)
NIFTY500_FALLBACK = [
    "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","HINDUNILVR","SBIN","BHARTIARTL",
    "ITC","KOTAKBANK","LT","AXISBANK","WIPRO","MARUTI","TATAMOTORS","SUNPHARMA",
    "HCLTECH","BAJFINANCE","TITAN","ASIANPAINT","NESTLEIND","ULTRACEMCO","POWERGRID",
    "TECHM","NTPC","ADANIENT","ADANIPORTS","JSWSTEEL","GRASIM","BAJAJFINSV",
    "DIVISLAB","CIPLA","DRREDDY","BPCL","ONGC","COALINDIA","HEROMOTOCO","APOLLOHOSP",
    "BAJAJ-AUTO","TATASTEEL","HINDALCO","EICHERMOT","BRITANNIA","UPL","TATACONSUM",
    "SBILIFE","HDFCLIFE","INDUSINDBK","M&M","PIDILITIND","SIEMENS","ABB","HAVELLS",
    "VOLTAS","GODREJCP","MARICO","DABUR","COLPAL","BERGEPAINT","AMBUJACEM","ACC",
    "SHREECEM","RAMCOCEM","BALKRISIND","MUTHOOTFIN","CHOLAFIN","BAJAJHLDNG","LICHSGFIN",
    "PNBHOUSING","L&TFH","PFC","RECLTD","IRFC","NHPC","SJVN","CANBK","PNB",
    "BANKBARODA","UNIONBANK","FEDERALBNK","IDFCFIRSTB","BANDHANBNK","RBLBANK","YESBANK",
    "TATAPOWER","ADANIGREEN","ADANITRANS","TRENT","NYKAA","DMART","ZOMATO","PAYTM",
    "POLICYBZR","IRCTC","INDIGO","SPICEJET","IDEA","MTNL","BSNL","RAILTEL","RVNL",
    "HUDCO","IRCON","NBCC","DLF","GODREJPROP","OBEROIRLTY","PRESTIGE","BRIGADE",
    "SOBHA","PHOENIXLTD","SUNTECK","MAHINDCIE","TATACHEM","GNFC","GSFC","AAPL",
    "ZYDUSLIFE","BIOCON","AUROPHARMA","TORNTPHARM","GLENMARK","IPCALAB","LAURUSLABS",
    "GRANULES","SUVEN","SEQUENT","ALKEM","MANKIND","JBCHEPHARM","ORCHPHARMA","NATCOPHARM",
    "STAR","JUBLFOOD","DEVYANI","SAPPHIRE","WESTLIFE","BARBEQUE","EASEMYTRIP","CHALET",
    "LEMON","INDHOTEL","TAJGVK","MAHINDRA","ESCORTS","KOEL","GREENPANEL","CENTURYPLY",
    "ASTRAL","FINPIPE","SUPREMEIND","JYOTHYLAB","EMAMILTD","RADICO","MCDOWELL-N",
    "VBL","PGHH","GILLETTE","3MINDIA","HONAUT","BOSCHLTD","SCHAEFFLER","TIMKEN",
    "SKFINDIA","GRINDWELL","KENNAMETAL","THERMAX","BEL","HAL","COCHINSHIP","GRSE",
    "MAZAGON","MIDHANI","BEML","BHEL","TITAGARH","TEXRAIL","CONCOR","GATEWAY",
    "ALLCARGO","GESHIP","SCI","AEGISLOG","MAHLOG","TCI","BLUEDART","VRL",
    "DELHIVERY","XPRESSBEES","ZINKA","TVSNXT","SAMVARDHANA","MOTHERSON","FIEM",
    "SUPRAJIT","ENDURANCE","MINDA","UNOMINDA","SONA","CRAFTSMAN","SANDHAR",
    "GABRIEL","SHRIPISTON","HFCL","GTPL","STLTECH","TEJAS","CIENA","ROUTE",
    "TANLA","TTML","ONMOBILE","NAZARA","GMMPFAUDLR","GUJGASLTD","IGL","MGL",
    "ATGL","MAHSEAMLES","APL","WELCORP","RATNAMANI","RITES","KERNEX","APARINDS",
    "POLYCAB","FINOLEX","KPITTECH","MPHASIS","LTTS","NIIT","INTELLECT","NEWGEN",
    "MASTEK","PERSISTENT","COFORGE","CYIENT","HEXAWARE","BIRLASOFT","SASKEN","SONATASOFTW"
]


class SignalFinderAgent:
    """Agent 1: Scans the full NIFTY 500 market concurrently using ThreadPoolExecutor."""
    
    def __init__(self):
        self.nse = NSEClient()
        self.yf = YFinanceClient()
        self.ensemble = EnsemblePredictor()
        self.risk_engine = RiskManager()
        self.feature_engineer = FeatureEngineer()
        self.tech_rules = TechnicalRulesEngine()
        self.pattern_detector = PatternDetector()

    def _bulk_fetch_ohlcv(self, symbols: List[str], batch_size: int = 50) -> Dict[str, pd.DataFrame]:
        """Download OHLCV for a batch of symbols in one yf.download call for speed."""
        result = {}
        ns_tickers = [f"{s}.NS" for s in symbols]
        
        for i in range(0, len(ns_tickers), batch_size):
            batch = ns_tickers[i:i+batch_size]
            orig_batch = symbols[i:i+batch_size]
            try:
                raw = yf.download(
                    batch, period="1y", interval="1d",
                    group_by="ticker", auto_adjust=True, progress=False, threads=True
                )
                for sym, ns_sym in zip(orig_batch, batch):
                    try:
                        if len(batch) == 1:
                            df = raw.copy()
                        else:
                            df = raw[ns_sym].copy()
                        df = df.dropna(subset=["Open", "High", "Low", "Close"])
                        df.index = pd.to_datetime(df.index).tz_localize(None)
                        df.columns = [c.capitalize() for c in df.columns]
                        # Ensure Volume column exists
                        if "Volume" not in df.columns:
                            df["Volume"] = 0
                        if len(df) >= 50:
                            result[sym] = df
                    except Exception:
                        pass
            except Exception as e:
                print(f"Bulk download error for batch {i}: {e}")
        return result

    def _analyze_single(self, symbol: str, df: pd.DataFrame) -> Dict | None:
        """Run ML + Technical analysis for one stock. Returns signal dict or None."""
        try:
            try:
                features_df = self.feature_engineer.build_features(symbol, df)
            except Exception:
                features_df = df
            if features_df is None or features_df.empty:
                features_df = df

            prediction = self.ensemble.predict(symbol, features_df)
            confidence = prediction['confidence']
            direction = prediction['signal_direction']

            decision = self.tech_rules.generate_decision(
                symbol=symbol,
                df=df,
                ml_confidence=confidence,
                ml_direction=direction
            )

            if decision['recommendation'] in ['BUY', 'SELL']:
                qty_params = self.risk_engine.generate_trade_parameters(
                    symbol, decision['current_price'], direction, df, confidence
                )
                return {
                    "id": str(uuid.uuid4()),
                    "symbol": symbol,
                    "confidence": confidence,
                    "direction": direction,
                    "recommendation": decision['recommendation'],
                    "trade_parameters": {
                        "symbol": symbol,
                        "direction": decision['recommendation'],
                        "entry_range": decision['entry_range'],
                        "entry_price_est": decision['current_price'],
                        "target": decision['target'],
                        "stop_loss": decision['stop_loss'],
                        "risk_tag": decision['risk_level'],
                        "suggested_qty": qty_params.get('suggested_qty', 1),
                        "confidence": confidence,
                        "time_horizon": decision['time_horizon'],
                    },
                    "technical_indicators": decision['technical_indicators'],
                    "patterns": self.pattern_detector.detect_patterns(df),
                    "decision_reasons": decision['decision_reasons'],
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
        except Exception as e:
            print(f"Error analyzing {symbol}: {e}")
        return None

    async def scan_market(self) -> List[Dict]:
        """Scan the full NIFTY 500 universe concurrently for maximum signal coverage."""
        signals = []

        # 1. Get symbol universe
        try:
            universe_data = self.nse.get_nifty500_stocks()
            symbols_to_scan = [u['symbol'] for u in universe_data if u.get('symbol')]
        except Exception:
            symbols_to_scan = []

        # Fall back to hardcoded list if NSE API is down
        if not symbols_to_scan:
            symbols_to_scan = NIFTY500_FALLBACK

        total = len(symbols_to_scan)
        print(f"[Scanner] Starting concurrent scan of {total} stocks...")

        # 2. Bulk-download OHLCV in large batches (much faster than per-symbol fetching)
        ohlcv_map = self._bulk_fetch_ohlcv(symbols_to_scan, batch_size=60)
        print(f"[Scanner] OHLCV loaded for {len(ohlcv_map)}/{total} symbols.")

        # 3. Analyze each stock concurrently
        with ThreadPoolExecutor(max_workers=16) as pool:
            futures = {
                pool.submit(self._analyze_single, sym, df): sym
                for sym, df in ohlcv_map.items()
            }
            for future in as_completed(futures):
                result = future.result()
                if result is not None:
                    signals.append(result)

        # 4. Rank by confidence descending
        signals.sort(key=lambda s: s['confidence'], reverse=True)
        print(f"[Scanner] Scan complete. {len(signals)} actionable signals found across {total} stocks.")
        return signals
