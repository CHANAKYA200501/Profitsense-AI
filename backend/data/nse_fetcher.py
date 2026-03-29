import requests
import pandas as pd
import time
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from functools import lru_cache
import yfinance as yf

class NSEClient:
    """
    Complete NSE API client.
    NOTE: NSE requires session warmup + proper headers.
    """
    BASE = "https://www.nseindia.com"
    
    ENDPOINTS = {
        'market_status':      '/api/marketStatus',
        'indices':            '/api/allIndices',
        'equity_search':      '/api/equity-search',
        'quote':              '/api/quote-equity',
        'chart_data':         '/api/chart-databyindex',
        'bulk_deals':         '/api/block-deal',
        'insider_trades':     '/api/corporates-pit',
        'corporate_actions':  '/api/corporates-corporateActions',
        'corporate_announce': '/api/corporates-announcements',
        'nifty50':            '/api/equity-stockIndices?index=NIFTY%2050',
        'nifty500':           '/api/equity-stockIndices?index=NIFTY%20500',
        'fii_dii':            '/api/fiidiiTradeReact',
        'circuit_breakers':   '/api/market-data-pre-open?key=ALL',
        'ipo_upcoming':       '/api/allIpo',
        'sgx_nifty':          '/api/SGXNifty',
    }
    
    def __init__(self):
        self.session = requests.Session()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Referer": "https://www.nseindia.com/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        }
        self._warm_session()
    
    def _warm_session(self):
        """Warm up session with cookies"""
        try:
            self.session.get(self.BASE, headers=self.headers, timeout=15)
            time.sleep(1.5)
            self.session.get(f"{self.BASE}/market-data/live-equity-market", 
                             headers=self.headers, timeout=10)
            time.sleep(0.5)
        except Exception as e:
            print(f"NSE session warm-up warning: {e}")
    
    def _get(self, endpoint: str, params: dict = None, retries: int = 3) -> dict:
        url = self.BASE + endpoint
        for attempt in range(retries):
            try:
                r = self.session.get(url, headers=self.headers, 
                                     params=params, timeout=15)
                r.raise_for_status()
                return r.json()
            except Exception as e:
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    return {}
    
    # ── MARKET DATA ──────────────────────────────────────────
    
    def get_quote(self, symbol: str) -> dict:
        """Real-time quote for a stock"""
        data = self._get('/api/quote-equity', params={'symbol': symbol})
        return {
            'symbol': symbol,
            'price': data.get('priceInfo', {}).get('lastPrice'),
            'change_pct': data.get('priceInfo', {}).get('pChange'),
            'volume': data.get('marketDeptOrderBook', {}).get('tradeInfo', {}).get('totalTradedVolume'),
            'circuit_upper': data.get('priceInfo', {}).get('upperCP'),
            'circuit_lower': data.get('priceInfo', {}).get('lowerCP'),
            '52w_high': data.get('priceInfo', {}).get('weekHighLow', {}).get('max'),
            '52w_low':  data.get('priceInfo', {}).get('weekHighLow', {}).get('min'),
        }
    
    def get_nifty500_stocks(self) -> List[Dict]:
        """All Nifty 500 stocks with current quotes"""
        data = self._get('/api/equity-stockIndices', params={'index': 'NIFTY 500'})
        return data.get('data', [])
    
    def get_fii_dii_activity(self) -> dict:
        """FII/DII buying/selling activity today"""
        return self._get(self.ENDPOINTS['fii_dii'])
    
    # ── CORPORATE EVENTS ─────────────────────────────────────
    
    def get_insider_trades(self, from_date: str, to_date: str, 
                           symbol: str = None) -> List[Dict]:
        """
        SEBI PIT (Prohibition of Insider Trading) disclosures.
        from_date, to_date: DD-MM-YYYY format
        """
        params = {"mode": "new", "from": from_date, "to": to_date}
        if symbol:
            params["symbol"] = symbol
        data = self._get('/api/corporates-pit', params=params)
        return data.get('data', [])
    
    def get_bulk_deals(self, from_date: str = None, to_date: str = None) -> List[Dict]:
        """Bulk and block deals"""
        data = self._get('/api/block-deal')
        return data.get('data', [])
    
    def get_corporate_announcements(self, symbol: str = None) -> List[Dict]:
        """Latest corporate announcements"""
        params = {}
        if symbol:
            params['symbol'] = symbol
        data = self._get('/api/corporates-announcements', params=params)
        return data.get('data', [])
    
    def get_corporate_actions(self, symbol: str) -> List[Dict]:
        """Dividends, bonus, splits for a stock"""
        data = self._get('/api/corporates-corporateActions', 
                         params={'index': 'equities', 'symbol': symbol})
        return data if isinstance(data, list) else []
    
    def get_upcoming_results(self) -> List[Dict]:
        """Stocks announcing results in next 7 days"""
        data = self._get('/api/corporates-corporateActions',
                         params={'index': 'equities'})
        results = [d for d in (data if isinstance(data, list) else [])
                   if 'Financial Result' in d.get('subject', '')]
        return results
    
    def get_promoter_pledging(self, symbol: str) -> dict:
        """Promoter pledge data from shareholding pattern"""
        data = self._get('/api/corporate-share-holdings-master',
                         params={'symbol': symbol})
        return data


class BSEClient:
    """BSE API Client"""
    BASE = "https://api.bseindia.com/BseIndiaAPI/api"
    
    def get_announcements(self, scrip_cd: str = None) -> List[Dict]:
        params = {"pageno": 1, "strCat": "-1", "strPrevDate": "", "strScrip": scrip_cd or "", "strSearch": "P", "strToDate": "", "strType": "C", "subcategory": "-1"}
        r = requests.get(f"{self.BASE}/AnnSubCategoryGetData/w", params=params, timeout=10)
        return r.json().get("Table", [])
    
    def get_quarterly_results(self, scrip_cd: str) -> List[Dict]:
        r = requests.get(f"{self.BASE}/ResultsHistorical/w", 
                         params={"scripcd": scrip_cd, "type": "QU"}, timeout=10)
        return r.json().get("ResultData", [])
    
    def get_bulk_deals(self, trade_date: str) -> List[Dict]:
        r = requests.get(f"{self.BASE}/BulkDealData/w",
                         params={"dttrade": trade_date, "scripcd": ""}, timeout=10)
        return r.json().get("Table", [])


class YFinanceClient:
    """yfinance wrapper with caching and error handling"""
    
    @staticmethod
    def get_ohlcv(symbol: str, period: str = "5y", interval: str = "1d") -> pd.DataFrame:
        ticker = yf.Ticker(f"{symbol}.NS")
        df = ticker.history(period=period, interval=interval)
        df.index = pd.to_datetime(df.index).tz_localize(None)
        return df[['Open', 'High', 'Low', 'Close', 'Volume']]
    
    @staticmethod
    def get_fundamentals(symbol: str) -> dict:
        info = yf.Ticker(f"{symbol}.NS").info
        return {
            "market_cap_cr":   round((info.get("marketCap") or 0) / 1e7, 2),
            "pe_ratio":        info.get("trailingPE"),
            "pb_ratio":        info.get("priceToBook"),
            "eps_ttm":         info.get("trailingEps"),
            "revenue_growth":  info.get("revenueGrowth"),
            "profit_margins":  info.get("profitMargins"),
            "roe":             info.get("returnOnEquity"),
            "debt_to_equity":  info.get("debtToEquity"),
            "current_ratio":   info.get("currentRatio"),
            "sector":          info.get("sector"),
            "industry":        info.get("industry"),
            "52w_high":        info.get("fiftyTwoWeekHigh"),
            "52w_low":         info.get("fiftyTwoWeekLow"),
            "avg_volume":      info.get("averageVolume"),
            "beta":            info.get("beta"),
            "dividend_yield":  info.get("dividendYield"),
        }
    
    @staticmethod
    def get_nifty_return(days: int) -> float:
        df = yf.download("^NSEI", period=f"{days+5}d", progress=False)
        df = df.tail(days + 1)
        if len(df) < 2:
            return 0.0
        return float((df['Close'].iloc[-1] / df['Close'].iloc[0]) - 1) * 100


class AMFIClient:
    """AMFI Mutual Fund data client"""
    
    NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"
    MFAPI  = "https://api.mfapi.in/mf"
    
    def get_all_current_navs(self) -> pd.DataFrame:
        """Download complete AMFI NAV file"""
        r = requests.get(self.NAV_URL, timeout=30)
        lines = r.text.strip().split('\n')
        
        records = []
        for line in lines:
            parts = line.split(';')
            if len(parts) >= 6 and parts[0].isdigit():
                records.append({
                    'scheme_code':  int(parts[0]),
                    'isin':         parts[1],
                    'isin_reinvest': parts[2],
                    'scheme_name':  parts[3],
                    'nav':          float(parts[4]) if parts[4] else None,
                    'nav_date':     parts[5].strip()
                })
        return pd.DataFrame(records)
    
    def get_scheme_history(self, scheme_code: int) -> pd.DataFrame:
        """Historical NAV for a scheme"""
        r = requests.get(f"{self.MFAPI}/{scheme_code}", timeout=15)
        data = r.json()
        df = pd.DataFrame(data['data'])
        df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y')
        df['nav'] = df['nav'].astype(float)
        return df.sort_values('date').set_index('date')
    
    def parse_cams_statement(self, text_content: str) -> dict:
        """
        Parse CAMS consolidated account statement text.
        Returns structured portfolio with transactions.
        """
        import re
        holdings = []
        
        # Regex patterns for CAMS statement parsing
        folio_pattern = r'Folio No:\s*(\S+)'
        scheme_pattern = r'Scheme:\s*(.+?)(?:\n|$)'
        transaction_pattern = r'(\d{2}-[A-Za-z]{3}-\d{4})\s+(Purchase|Redemption|SIP|Switch)\s+([\d,\.]+)\s+([\d\.]+)\s+([\d,\.]+)'
        
        for match in re.finditer(transaction_pattern, text_content):
            date_str, txn_type, amount, nav, units = match.groups()
            holdings.append({
                'date': datetime.strptime(date_str, '%d-%b-%Y'),
                'type': txn_type,
                'amount': float(amount.replace(',', '')),
                'nav': float(nav),
                'units': float(units.replace(',', ''))
            })
        
        return {"transactions": holdings}
    
    def calculate_xirr(self, transactions: list) -> float:
        """
        XIRR calculation for SIP/lump-sum MF portfolio.
        transactions: [{"date": datetime, "amount": float}]
        Negative amount = investment, positive = current value / redemption
        """
        from scipy import optimize
        import numpy_financial as npf
        
        if len(transactions) < 2:
            return 0.0
        
        dates   = [t['date'] for t in transactions]
        amounts = [t['amount'] for t in transactions]
        d0 = min(dates)
        
        def npv(rate):
            return sum(amt / ((1 + rate) ** ((d - d0).days / 365.0))
                       for amt, d in zip(amounts, dates))
        
        try:
            result = optimize.brentq(npv, -0.999, 100.0, maxiter=1000)
            return round(result * 100, 2)
        except Exception:
            return 0.0
    
    def calculate_portfolio_overlap(self, scheme_codes: list) -> dict:
        """
        Calculate overlap between MF schemes.
        Returns overlap matrix and recommendations.
        """
        # Fetch current holdings for each scheme
        from .repositories import MFRepository
        repo = MFRepository()
        
        holdings = {}
        for code in scheme_codes:
            holdings[code] = set(repo.get_scheme_holdings(code))
        
        overlap_matrix = {}
        for i, c1 in enumerate(scheme_codes):
            for c2 in scheme_codes[i+1:]:
                intersection = holdings[c1] & holdings[c2]
                union = holdings[c1] | holdings[c2]
                overlap_pct = len(intersection) / len(union) * 100 if union else 0
                overlap_matrix[f"{c1}_{c2}"] = {
                    'schemes': [c1, c2],
                    'overlap_pct': round(overlap_pct, 1),
                    'common_stocks': list(intersection)[:10]
                }
        
        return overlap_matrix


class NewsClient:
    """ET Markets + News scraper for sentiment analysis"""
    
    ET_RSS = {
        # Economic Times
        'ET Markets':   'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
        'ET Stocks':    'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
        'ET Economy':   'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms',
        # Moneycontrol
        'MC Markets':   'https://www.moneycontrol.com/rss/marketreports.xml',
        'MC Business':  'https://www.moneycontrol.com/rss/business.xml',
        # LiveMint
        'Mint Markets': 'https://www.livemint.com/rss/markets',
        'Mint Economy': 'https://www.livemint.com/rss/economy',
        # NDTV Profit
        'NDTV Profit':  'https://profit.ndtv.com/rssfeeds/profit.xml',
        # Business Standard
        'BS Markets':   'https://www.business-standard.com/rss/markets-106.rss',
    }
    
    def get_latest_news(self, symbol: str = None, max_items: int = 20) -> list:
        """Fetch latest market news from ET RSS"""
        import feedparser
        import requests
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        all_items = []
        for feed_name, url in self.ET_RSS.items():
            try:
                r = requests.get(url, headers=headers, timeout=5)
                feed = feedparser.parse(r.content)
                for entry in feed.entries[:max_items]:
                    item = {
                        'title': entry.title,
                        'summary': entry.get('summary', ''),
                        'published': entry.get('published', ''),
                        'link': entry.link,
                        'source': f'ET {feed_name.title()}'
                    }
                    # Filter by symbol if provided
                    if symbol:
                        company_names = self._get_company_aliases(symbol)
                        if any(name.lower() in item['title'].lower() + item['summary'].lower() 
                               for name in company_names):
                            all_items.append(item)
                    else:
                        all_items.append(item)
            except Exception as e:
                print(f"Failed to fetch {url}: {e}")
        
        return all_items[:max_items]
    
    def _get_company_aliases(self, symbol: str) -> list:
        ALIASES = {
            'RELIANCE': ['Reliance', 'RIL', 'Mukesh Ambani'],
            'TCS': ['TCS', 'Tata Consultancy'],
            'HDFCBANK': ['HDFC Bank', 'HDFCBank'],
            'INFY': ['Infosys', 'Infy'],
        }
        return ALIASES.get(symbol, [symbol])
