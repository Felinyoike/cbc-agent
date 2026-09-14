import os
import json
import boto3
from chromadb import Documents, EmbeddingFunction, Embeddings

class BedrockEmbeddingFunction(EmbeddingFunction):
    """ChromaDB Embedding Function for AWS Bedrock (e.g. Titan Embeddings V2)."""
    
    def __init__(self, model_name: str = "amazon.titan-embed-text-v2:0", region_name: str = None):
        self.model_name = os.environ.get("BEDROCK_EMBEDDING_MODEL_ID", model_name)
        self.region_name = region_name or os.environ.get("AWS_REGION", "us-east-1")
        
        self.client = boto3.client(
            service_name="bedrock-runtime",
            region_name=self.region_name,
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
            aws_session_token=os.environ.get("AWS_SESSION_TOKEN"),
        )

    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for doc in input:
            body = json.dumps({"inputText": doc})
            response = self.client.invoke_model(
                modelId=self.model_name,
                contentType="application/json",
                accept="application/json",
                body=body,
            )
            response_body = json.loads(response.get("body").read())
            embeddings.append(response_body.get("embedding"))
        return embeddings
