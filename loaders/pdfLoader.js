import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export const loadPDF = async (filePath) => {
    const loader = new PDFLoader(filePath);

    const docs = await loader.load();

    console.log("📄 PDF Loaded Successfully");

    return docs;
};