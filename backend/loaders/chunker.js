import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const chunkDocuments = async (documents) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const chunkedDocs = await splitter.splitDocuments(documents);

    console.log(`✂ Created ${chunkedDocs.length} chunks`);

    return chunkedDocs;
};