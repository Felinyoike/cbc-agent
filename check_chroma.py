import chromadb

client = chromadb.PersistentClient(path='kicd_chroma_db')
collection = client.get_collection('kicd_curriculum')
data = collection.get(include=['metadatas'])

subjects = sorted(set(m['subject'] for m in data['metadatas']))
grades = sorted(set(m['grade'] for m in data['metadatas']))

print('Subjects in Chroma:', subjects)
print('Grades in Chroma:', grades)