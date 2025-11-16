import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: ''
});
const index = pc.index('quickstart');

api key is in .env


 see https://docs.pinecone.io/guides/manage-data/target-an-index
const namespace = pc.index("INDEX_NAME", "INDEX_HOST").namespace("example-namespace");

// Upsert records into a namespace
// `chunk_text` fields are converted to sparse vectors
// `category` and `quarter` fields are stored as metadata
await namespace.upsertRecords([
    { 
        "_id": "vec1", 
        "chunk_text": "AAPL reported a year-over-year revenue increase, expecting stronger Q3 demand for its flagship phones.", 
        "category": "technology",
        "quarter": "Q3"
    },
    { 
        "_id": "vec2", 
        "chunk_text": "Analysts suggest that AAPL'\''s upcoming Q4 product launch event might solidify its position in the premium smartphone market.", 
        "category": "technology",
        "quarter": "Q4"
    },
    { 
        "_id": "vec3", 
        "chunk_text": "AAPL'\''s strategic Q3 partnerships with semiconductor suppliers could mitigate component risks and stabilize iPhone production.",
        "category": "technology",
        "quarter": "Q3"
    },
    { 
        "_id": "vec4", 
        "chunk_text": "AAPL may consider healthcare integrations in Q4 to compete with tech rivals entering the consumer wellness space.", 
        "category": "technology",
        "quarter": "Q4"
    }
]);
​
Upsert in batches
To control costs when ingesting large datasets (10,000,000+ records), use import instead of upsert.
Send upserts in batches to help increase throughput.
When upserting records with vectors, a batch should be as large as possible (up to 1000 records) without exceeding the max request size of 2 MB.
To understand the number of records you can fit into one batch based on the vector dimensions and metadata size, see the following table:
Dimension	Metadata (bytes)	Max batch size
386	0	1000
768	500	559
1536	2000	245
When upserting records with text, a batch can contain up to 96 records. This limit comes from the hosted embedding models used during integrated embedding rather than the batch size limit for upserting raw vectors.

Python

JavaScript

Java

Go

Copy
import { Pinecone } from "@pinecone-database/pinecone";

const RECORD_COUNT = 10000;
const RECORD_DIMENSION = 128;

const client = new Pinecone({ apiKey: "YOUR_API_KEY" });
const index = client.index("docs-example");

// A helper function that breaks an array into chunks of size batchSize
const chunks = (array, batchSize = 200) => {
  const chunks = [];

  for (let i = 0; i < array.length; i += batchSize) {
    chunks.push(array.slice(i, i + batchSize));
  }

  return chunks;
};

// Example data generation function, creates many (id, vector) pairs
const generateExampleData = () =>
  Array.from({ length: RECORD_COUNT }, (_, i) => {
    return {
      id: `id-${i}`,
      values: Array.from({ length: RECORD_DIMENSION }, (_, i) => Math.random()),
    };
  });

const exampleRecordData = generateExampleData();
const recordChunks = chunks(exampleRecordData);

// Upsert data with 200 records per upsert request
for (const chunk of recordChunks) {
  await index.upsert(chunk)
}
​
Upsert in parallel
Python SDK v6.0.0 and later provide async methods for use with asyncio. Asyncio support makes it possible to use Pinecone with modern async web frameworks such as FastAPI, Quart, and Sanic. For more details, see Asyncio support.
Send multiple upserts in parallel to help increase throughput. Vector operations block until the response has been received. However, they can be made asynchronously as follows:

Python

JavaScript

Java

Go

Copy
import { Pinecone } from "@pinecone-database/pinecone";

const RECORD_COUNT = 10000;
const RECORD_DIMENSION = 128;

const client = new Pinecone({ apiKey: "YOUR_API_KEY" });

// To get the unique host for an index, 
// see https://docs.pinecone.io/guides/manage-data/target-an-index
const index = pc.index("INDEX_NAME", "INDEX_HOST")

// A helper function that breaks an array into chunks of size batchSize
const chunks = (array, batchSize = 200) => {
  const chunks = [];

  for (let i = 0; i < array.length; i += batchSize) {
    chunks.push(array.slice(i, i + batchSize));
  }

  return chunks;
};

// Example data generation function, creates many (id, vector) pairs
const generateExampleData = () =>
  Array.from({ length: RECORD_COUNT }, (_, i) => {
    return {
      id: `id-${i}`,
      values: Array.from({ length: RECORD_DIMENSION }, (_, i) => Math.random()),
    };
  });

const exampleRecordData = generateExampleData();
const recordChunks = chunks(exampleRecordData);

// Upsert data with 200 records per request asynchronously using Promise.all()
await Promise.all(recordChunks.map((chunk) => index.upsert(chunk)));


Search with text
Searching with text is supported only for indexes with integrated embedding.
To search a dense index with a query text, use the search_records operation with the following parameters:
The namespace to query. To use the default namespace, set the namespace to "__default__".
The query.inputs.text parameter with the query text. Pinecone uses the embedding model integrated with the index to convert the text to a dense vector automatically.
The query.top_k parameter with the number of similar records to return.
Optionally, you can specify the fields to return in the response. If not specified, the response will include all fields.
For example, the following code searches for the 2 records most semantically related to a query text:

Python

JavaScript

Java

Go

C#

curl

Copy
import { Pinecone } from '@pinecone-database/pinecone'

const pc = new Pinecone({ apiKey: "YOUR_API_KEY" })

// To get the unique host for an index, 
// see https://docs.pinecone.io/guides/manage-data/target-an-index
const namespace = pc.index("INDEX_NAME", "INDEX_HOST").namespace("example-namespace");

const response = await namespace.searchRecords({
  query: {
    topK: 2,
    inputs: { text: 'Disease prevention' },
  },
  fields: ['chunk_text', 'category'],
});

console.log(response);
The response will look as follows. Each record is returned with a similarity score that represents its distance to the query vector, calculated according to the similarity metric for the index.

Python

JavaScript

Java

Go

C#

curl

Copy
{
  result: { 
    hits: [ 
      {
        _id: 'rec3',
        _score: 0.82042724,
        fields: {
          category: 'immune system',
          chunk_text: 'Rich in vitamin C and other antioxidants, apples contribute to immune health and may reduce the risk of chronic diseases.'
        }
      },
      {
        _id: 'rec1',
        _score: 0.7931626,
        fields: {
          category: 'digestive system',
          chunk_text: 'Apples are a great source of dietary fiber, which supports digestion and helps maintain a healthy gut.'
        }
      }
    ]
  },
  usage: { 
    readUnits: 6, 
    embedTotalTokens: 8 
  }
}
​
Search with a dense vector
To search a dense index with a dense vector representation of a query, use the query operation with the following parameters:
The namespace to query. To use the default namespace, set the namespace to "__default__".
The vector parameter with the dense vector values representing your query.
The top_k parameter with the number of results to return.
Optionally, you can set include_values and/or include_metadata to true to include the vector values and/or metadata of the matching records in the response. However, when querying with top_k over 1000, avoid returning vector data or metadata for optimal performance.
For example, the following code uses a dense vector representation of the query “Disease prevention” to search for the 3 most semantically similar records in the example-namespaces namespace:

Python

JavaScript

Java

Go

C#

curl

Copy
import { Pinecone } from '@pinecone-database/pinecone'

const pc = new Pinecone({ apiKey: "YOUR_API_KEY" })

// To get the unique host for an index, 
// see https://docs.pinecone.io/guides/manage-data/target-an-index
const index = pc.index("INDEX_NAME", "INDEX_HOST")

const queryResponse = await index.namespace('example-namespace').query({
    vector: [0.0236663818359375,-0.032989501953125,...,-0.01041412353515625,0.0086669921875],
    topK: 3,
    includeValues: false,
    includeMetadata: true,
});
The response will look as follows. Each record is returned with a similarity score that represents its distance to the query vector, calculated according to the similarity metric for the index.

Python

JavaScript

Java

Go

C#

curl

Copy
{
  matches: [
    {
      id: 'rec3',
      score: 0.819709897,
      values: [],
      sparseValues: undefined,
      metadata: [Object]
    },
    {
      id: 'rec1',
      score: 0.792900264,
      values: [],
      sparseValues: undefined,
      metadata: [Object]
    },
    {
      id: 'rec4',
      score: 0.780068815,
      values: [],
      sparseValues: undefined,
      metadata: [Object]
    }
  ],
  namespace: 'example-namespace',
  usage: { readUnits: 6 }
}

ntegrated reranking
To rerank initial results as an integrated part of a query, without any extra steps, use the search operation with the rerank parameter, including the hosted reranking model you want to use, the number of reranked results to return, and the fields to use for reranking, if different than the main query.
For example, the following code searches for the 3 records most semantically related to a query text and uses the hosted bge-reranker-v2-m3 model to rerank the results and return only the 2 most relevant documents:

Python

JavaScript

Java

Go

C#

curl

Copy
import { Pinecone } from '@pinecone-database/pinecone'

const pc = new Pinecone({ apiKey: "YOUR_API_KEY" })

// To get the unique host for an index, 
// see https://docs.pinecone.io/guides/manage-data/target-an-index
const namespace = pc.index("INDEX_NAME", "INDEX_HOST").namespace("example-namespace");

const response = await namespace.searchRecords({
  query: {
    topK: 2,
    inputs: { text: 'Disease prevention' },
  },
  fields: ['chunk_text', 'category'],
  rerank: {
    model: 'bge-reranker-v2-m3',
    rankFields: ['chunk_text'],
    topN: 2,
  },
});

console.log(response);
The response looks as follows. For each hit, the _score represents the relevance of a document to the query, normalized between 0 and 1, with scores closer to 1 indicating higher relevance.

Python

JavaScript

Java

Go

C#

curl

Copy
{
  result: { 
    hits: [ 
      {
        _id: 'rec3',
        _score: 0.004399413242936134,
        fields: {
          category: 'immune system',
          chunk_text: 'Rich in vitamin C and other antioxidants, apples contribute to immune health and may reduce the risk of chronic diseases.'
        }
      },
      {
        _id: 'rec4',
        _score: 0.0029235430993139744,
        fields: {
          category: 'endocrine system',
          chunk_text: 'The high fiber content in apples can also help regulate blood sugar levels, making them a favorable snack for people with diabetes.'
        }
      }
    ]
  },
  usage: { 
    readUnits: 6, 
    embedTotalTokens: 8,
    rerankUnits: 1 
  }
}
​
Standalone reranking
To rerank initial results as a standalone operation, use the rerank operation with the hosted reranking model you want to use, the query results and the query, the number of ranked results to return, the field to use for reranking, and any other model-specific parameters.
For example, the following code uses the hosted bge-reranker-v2-m3 model to rerank the values of the documents.chunk_text fields based on their relevance to the query and return only the 2 most relevant documents, along with their score:

Python

JavaScript

Java

Go

C#

curl

Copy
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ apiKey: 'YOUR_API_KEY' });

const rerankingModel = 'bge-reranker-v2-m3';

const query = "What is AAPL's outlook, considering both product launches and market conditions?";

const documents = [
  { id: 'vec2', chunk_text: "Analysts suggest that AAPL's upcoming Q4 product launch event might solidify its position in the premium smartphone market." },
  { id: 'vec3', chunk_text: "AAPL's strategic Q3 partnerships with semiconductor suppliers could mitigate component risks and stabilize iPhone production." },
  { id: 'vec1', chunk_text: "AAPL reported a year-over-year revenue increase, expecting stronger Q3 demand for its flagship phones." },
];

const rerankOptions = {
  topN: 2,
  rankFields: ['chunk_text'],
  returnDocuments: true,
  parameters: {
    truncate: 'END'
  }, 
};

const rankedResults = await pc.inference.rerank(
  rerankingModel,
  query,
  documents,
  rerankOptions
);

console.log(rankedResults);
The response looks as follows. For each hit, the _score represents the relevance of a document to the query, normalized between 0 and 1, with scores closer to 1 indicating higher relevance.

Python

JavaScript

Java

Go

C#

curl

Copy
{
  model: 'bge-reranker-v2-m3',
  data: [
    { index: 0, score: 0.004166256, document: [id: 'vec2', chunk_text: "Analysts suggest that AAPL'''s upcoming Q4 product launch event might solidify its position in the premium smartphone market."] },
    { index: 2, score: 0.0011513996, document: [id: 'vec1', chunk_text: 'AAPL reported a year-over-year revenue increase, expecting stronger Q3 demand for its flagship phones.'] }
  ],
  usage: { rerankUnits: 1 }
}
​
Reranking models
Pinecone hosts several reranking models so it’s easy to manage two-stage vector retrieval on a single platform. You can use a hosted model to rerank results as an integrated part of a query, or you can use a hosted model to rerank results as a standalone operation.
The following reranking models are hosted by Pinecone.
To understand how cost is calculated for reranking, see Reranking cost. To get model details via the API, see List models and Describe a model.


use this mode: pinecone-rerank-v0