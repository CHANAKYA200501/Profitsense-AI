from sqlalchemy import Column, Integer, String, Boolean, Numeric, BigInteger, Date, DateTime, Float, ForeignKey, text, JSON, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
import uuid
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=True)
    risk_profile: Mapped[str] = mapped_column(String, nullable=True) # 'conservative','moderate','aggressive'
    investment_horizon: Mapped[str] = mapped_column(String, nullable=True) # 'short','medium','long'
    portfolio_value_lakh: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    telegram_chat_id: Mapped[int] = mapped_column(BigInteger, nullable=True)
    whatsapp_number: Mapped[str] = mapped_column(String, nullable=True)
    alert_preferences: Mapped[dict] = mapped_column(JSONB, server_default='{"email":true,"telegram":false,"push":true}')
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"), onupdate=text("NOW()"))

    portfolio_holdings = relationship("PortfolioHolding", back_populates="user", cascade="all, delete-orphan")
    mf_holdings = relationship("UserMFHolding", back_populates="user", cascade="all, delete-orphan")


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    avg_buy_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    buy_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    exchange: Mapped[str] = mapped_column(String, server_default='NSE')
    notes: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    user = relationship("User", back_populates="portfolio_holdings")
    
    __table_args__ = (
        Index('idx_user_symbol', 'user_id', 'symbol', unique=True),
    )


class SignalEvent(Base):
    __tablename__ = "signal_events"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    symbol: Mapped[str] = mapped_column(String, nullable=False, index=True)
    signal_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String, nullable=True, index=True) # 'bullish','bearish','watch'
    confidence: Mapped[int] = mapped_column(Integer, nullable=True)
    
    xgb_score: Mapped[float] = mapped_column(Numeric(6, 4), nullable=True)
    lgbm_score: Mapped[float] = mapped_column(Numeric(6, 4), nullable=True)
    lstm_score: Mapped[float] = mapped_column(Numeric(6, 4), nullable=True)
    ensemble_score: Mapped[float] = mapped_column(Numeric(6, 4), nullable=True)
    
    price_at_signal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    nifty_at_signal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    
    headline: Mapped[str] = mapped_column(String, nullable=True)
    what_happened: Mapped[str] = mapped_column(String, nullable=True)
    why_matters: Mapped[str] = mapped_column(String, nullable=True)
    suggested_action: Mapped[str] = mapped_column(String, nullable=True)
    risk_factors: Mapped[str] = mapped_column(String, nullable=True)
    history_stats: Mapped[dict] = mapped_column(JSONB, nullable=True)
    
    trigger_data: Mapped[dict] = mapped_column(JSONB, nullable=True)
    shap_features: Mapped[dict] = mapped_column(JSONB, nullable=True)
    
    detected_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=text("NOW()"), index=True)
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    
    price_30d: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    price_60d: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    price_90d: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    return_30d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    return_60d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    return_90d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    nifty_return_30d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    alpha_30d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    outcome_success: Mapped[bool] = mapped_column(Boolean, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))


class PriceData(Base):
    __tablename__ = "price_data"
    
    time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), primary_key=True)
    symbol: Mapped[str] = mapped_column(String, primary_key=True)
    exchange: Mapped[str] = mapped_column(String, server_default='NSE')
    open: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    high: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    low: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    close: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=True)
    adj_close: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)


class InsiderTrade(Base):
    __tablename__ = "insider_trades"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    person_name: Mapped[str] = mapped_column(String, nullable=True)
    person_category: Mapped[str] = mapped_column(String, nullable=True)
    transaction_type: Mapped[str] = mapped_column(String, nullable=True)
    quantity: Mapped[int] = mapped_column(BigInteger, nullable=True)
    avg_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    total_value: Mapped[float] = mapped_column(Numeric(18, 2), nullable=True)
    holding_before: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    holding_after: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    trade_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    filing_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    source_url: Mapped[str] = mapped_column(String, nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    __table_args__ = (Index('idx_insider_symbol', 'symbol', 'trade_date'),)


class BulkBlockDeal(Base):
    __tablename__ = "bulk_block_deals"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    deal_type: Mapped[str] = mapped_column(String, nullable=True)
    client_name: Mapped[str] = mapped_column(String, nullable=True)
    trade_type: Mapped[str] = mapped_column(String, nullable=True)
    quantity: Mapped[int] = mapped_column(BigInteger, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    value_cr: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    trade_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    __table_args__ = (Index('idx_bulk_symbol', 'symbol', 'trade_date'),)


class CorporateEvent(Base):
    __tablename__ = "corporate_events"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    event_type: Mapped[str] = mapped_column(String, nullable=True)
    event_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    ex_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))


class QuarterlyResult(Base):
    __tablename__ = "quarterly_results"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    quarter: Mapped[str] = mapped_column(String, nullable=False)
    result_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    revenue_cr: Mapped[float] = mapped_column(Numeric(14, 2), nullable=True)
    ebitda_cr: Mapped[float] = mapped_column(Numeric(14, 2), nullable=True)
    pat_cr: Mapped[float] = mapped_column(Numeric(14, 2), nullable=True)
    eps: Mapped[float] = mapped_column(Numeric(10, 4), nullable=True)
    eps_estimate: Mapped[float] = mapped_column(Numeric(10, 4), nullable=True)
    eps_surprise_pct: Mapped[float] = mapped_column(Numeric(8, 2), nullable=True)
    revenue_growth_yoy: Mapped[float] = mapped_column(Numeric(8, 2), nullable=True)
    pat_growth_yoy: Mapped[float] = mapped_column(Numeric(8, 2), nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    __table_args__ = (Index('idx_result_symbol_quarter', 'symbol', 'quarter', unique=True),)


class BacktestResult(Base):
    __tablename__ = "backtest_results"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    signal_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    signal_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    
    entry_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    nifty_entry: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    
    price_10d: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    price_30d: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    price_60d: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    price_90d: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    
    return_10d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    return_30d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    return_60d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    return_90d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    
    nifty_return_10d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    nifty_return_30d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    nifty_return_60d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    
    alpha_10d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    alpha_30d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    alpha_60d: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    
    success_30d: Mapped[bool] = mapped_column(Boolean, nullable=True)
    ensemble_score: Mapped[float] = mapped_column(Numeric(6, 4), nullable=True)
    signal_details: Mapped[dict] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    __table_args__ = (Index('idx_bt_symbol', 'symbol', 'signal_date'),)


class MFScheme(Base):
    __tablename__ = "mf_schemes"
    
    scheme_code: Mapped[int] = mapped_column(Integer, primary_key=True)
    scheme_name: Mapped[str] = mapped_column(String, nullable=False)
    amc_name: Mapped[str] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String, nullable=True)
    sub_category: Mapped[str] = mapped_column(String, nullable=True)
    fund_manager: Mapped[str] = mapped_column(String, nullable=True)
    launch_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    nav_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    nav: Mapped[float] = mapped_column(Numeric(12, 4), nullable=True)
    aum_cr: Mapped[float] = mapped_column(Numeric(14, 2), nullable=True)
    expense_ratio: Mapped[float] = mapped_column(Numeric(6, 4), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))


class MFNAVHistory(Base):
    __tablename__ = "mf_nav_history"
    
    time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), primary_key=True)
    scheme_code: Mapped[int] = mapped_column(ForeignKey("mf_schemes.scheme_code"), primary_key=True)
    nav: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)


class MFPortfolioHolding(Base):
    __tablename__ = "mf_portfolio_holdings"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    scheme_code: Mapped[int] = mapped_column(Integer, nullable=True)
    month_year: Mapped[str] = mapped_column(String, nullable=True)
    stock_symbol: Mapped[str] = mapped_column(String, nullable=True)
    corpus_pct: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    shares_held: Mapped[int] = mapped_column(BigInteger, nullable=True)
    market_value_cr: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))


class UserMFHolding(Base):
    __tablename__ = "user_mf_holdings"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)
    scheme_code: Mapped[int] = mapped_column(Integer, nullable=True)
    scheme_name: Mapped[str] = mapped_column(String, nullable=True)
    folio_number: Mapped[str] = mapped_column(String, nullable=True)
    units: Mapped[float] = mapped_column(Numeric(14, 4), nullable=True)
    avg_nav: Mapped[float] = mapped_column(Numeric(12, 4), nullable=True)
    current_nav: Mapped[float] = mapped_column(Numeric(12, 4), nullable=True)
    invested_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=True)
    current_value: Mapped[float] = mapped_column(Numeric(14, 2), nullable=True)
    xirr: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    transactions: Mapped[dict] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))

    user = relationship("User", back_populates="mf_holdings")


class StockFundamental(Base):
    __tablename__ = "stock_fundamentals"
    
    symbol: Mapped[str] = mapped_column(String, primary_key=True)
    company_name: Mapped[str] = mapped_column(String, nullable=True)
    sector: Mapped[str] = mapped_column(String, nullable=True)
    industry: Mapped[str] = mapped_column(String, nullable=True)
    bse_code: Mapped[int] = mapped_column(Integer, nullable=True)
    nse_code: Mapped[str] = mapped_column(String, nullable=True)
    market_cap_cr: Mapped[float] = mapped_column(Numeric(14, 2), nullable=True)
    pe_ratio: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    pb_ratio: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    ev_ebitda: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    roe: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    roce: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    debt_equity: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    promoter_holding_pct: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    promoter_pledge_pct: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    fii_holding_pct: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    dii_holding_pct: Mapped[float] = mapped_column(Numeric(8, 4), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("NOW()"))
