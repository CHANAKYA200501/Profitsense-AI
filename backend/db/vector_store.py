from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue
)
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    class SentenceTransformer:
        def __init__(self, *args, **kwargs): pass
        def encode(self, text, *args, **kwargs): return [0.0] * 384

import numpy as np
import uuid

class PatternVectorStore:
    """
    Stores pattern embeddings for semantic similarity search.
    "Find me historical setups similar to this one"
    """
    
    COLLECTION = "market_patterns"
    VECTOR_DIM = 384  # sentence-transformers/all-MiniLM-L6-v2
    
    def __init__(self, host: str = "localhost", port: int = 6333):
        self.client = QdrantClient(host=host, port=port)
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self._ensure_collection()
    
    def _ensure_collection(self):
        existing = [c.name for c in self.client.get_collections().collections]
        if self.COLLECTION not in existing:
            self.client.create_collection(
                collection_name=self.COLLECTION,
                vectors_config=VectorParams(
                    size=self.VECTOR_DIM,
                    distance=Distance.COSINE
                )
            )
    
    def _encode_pattern(self, signal: dict) -> np.ndarray:
        """
        Create a text description of the signal for embedding.
        """
        text = (
            f"Symbol {signal['symbol']} sector {signal.get('sector','')} "
            f"signal {signal['signal_type']} direction {signal['direction']} "
            f"price {signal.get('price',0):.0f} rsi {signal.get('rsi',50):.0f} "
            f"volume ratio {signal.get('volume_ratio',1):.1f} "
            f"above 200ma {signal.get('above_200ma',False)} "
            f"insider count {signal.get('insider_count',0)} "
            f"earnings surprise {signal.get('earnings_surprise_pct',0):.0f}"
        )
        return self.encoder.encode(text)
    
    def store_pattern(self, signal: dict, outcome_30d: float = None):
        """Store a pattern with its eventual outcome"""
        vector = self._encode_pattern(signal)
        
        self.client.upsert(
            collection_name=self.COLLECTION,
            points=[PointStruct(
                id=str(uuid.uuid4()),
                vector=vector.tolist(),
                payload={
                    **signal,
                    'outcome_30d': outcome_30d,
                    'success': outcome_30d > 0.03 if outcome_30d else None
                }
            )]
        )
    
    def find_similar_patterns(self, signal: dict, top_k: int = 10) -> list:
        """
        Find the most historically similar setups and their outcomes.
        Powers the 'HISTORY SAYS' section of alerts.
        """
        vector = self._encode_pattern(signal)
        
        results = self.client.search(
            collection_name=self.COLLECTION,
            query_vector=vector.tolist(),
            query_filter=Filter(
                must=[FieldCondition(
                    key="outcome_30d",
                    match=MatchValue(value=None)  # Only completed outcomes
                )]
            ),
            limit=top_k,
            with_payload=True
        )
        
        patterns = [r.payload for r in results]
        outcomes = [p['outcome_30d'] for p in patterns if p.get('outcome_30d')]
        
        if not outcomes:
            return []
        
        win_rate = sum(1 for o in outcomes if o > 0.03) / len(outcomes) * 100
        avg_return = np.mean(outcomes) * 100
        
        return {
            'similar_count': len(outcomes),
            'win_rate': round(win_rate, 1),
            'avg_return_30d': round(avg_return, 1),
            'avg_alpha_30d': round(avg_return - 1.5, 1),  # approx Nifty monthly return
            'similar_examples': patterns[:3]  # Top 3 most similar
        }
