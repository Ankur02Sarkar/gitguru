import { db } from "@/server/db";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import type { Document } from "langchain/document";
import { Octokit } from "octokit";
import { generateEmbedding, summariseCode } from "./gemini";

const getFileCount = async (
  path: string,
  octokit: Octokit,
  githubOwner: string,
  githubRepo: string,
  acc = 0,
) => {
  const { data } = await octokit.rest.repos.getContent({
    owner: githubOwner,
    repo: githubRepo,
    path,
  });

  if (!Array.isArray(data) && data.type === "file") {
    return acc + 1;
  }

  if (Array.isArray(data)) {
    let fileCount = 0;
    const directories: string[] = [];

    for (const item of data) {
      if (item.type === "dir") {
        directories.push(item.path);
      } else if (item.type === "file") {
        fileCount += 1;
      }
    }

    if (directories.length > 0) {
      const directoryCounts = await Promise.all(
        directories.map((dirPath) =>
          getFileCount(dirPath, octokit, githubOwner, githubRepo, 0),
        ),
      );
      fileCount += directoryCounts.reduce((acc, count) => acc + count, 0);
    }
    return acc + fileCount;
  }

  return acc;
};

export const checkCredits = async (githubUrl: string, githubToken: string) => {
  // find out how many files are in the repo
  const octokit = new Octokit({
    auth: githubToken,
  });

  const githubOwner = githubUrl.split("/")[3];
  let githubRepo = githubUrl.split("/")[4];
  // Remove ".git" suffix if it exists
  if (githubRepo && githubRepo.endsWith(".git")) {
    githubRepo = githubRepo.slice(0, -4); // Remove the last 4 characters
  }
  console.log("githubOwner : ", githubOwner);
  console.log("githubRepo : ", githubRepo);

  if (!githubOwner || !githubRepo) {
    return 0;
  }
  const fileCount = await getFileCount("", octokit, githubOwner, githubRepo, 0);
  return fileCount;
};

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
) => {
  // langchain
  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken || "",
    branch: "main",
    ignoreFiles: [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
    ],
    recursive: true,
    unknown: "warn",
    maxConcurrency: 5,
  });

  const docs = await loader.load();
  return docs;
};

//console.log(await loadGithubRepo('https://github.com/PHantasm111/RiskFI'));

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  const docs = await loadGithubRepo(githubUrl, githubToken);
  const allEmbeddings = await generateEmbeddings(docs);

  await Promise.allSettled(
    allEmbeddings.map(async (embedding, index) => {
      console.log(`processing ${index} of ${allEmbeddings.length}`);

      if (!embedding) return;

      console.log("inserting ...");

      const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
        data: {
          sourceCode: embedding.sourceCode,
          fileName: embedding.fileName,
          summary: embedding.summary,
          projectId,
        },
      });

      await db.$executeRaw`
            UPDATE "SourceCodeEmbedding" 
            SET "summaryEmbedding" = ${embedding.embedding}::vector
            WHERE "id" = ${sourceCodeEmbedding.id}; 
        `;

      console.log("inserted !");
    }),
  );
};

const generateEmbeddings = async (docs: Document[]) => {
  return await Promise.all(
    docs.map(async (doc) => {
      const summary = (await summariseCode(doc)) as string;
      const embedding = await generateEmbedding(summary);
      return {
        summary,
        embedding,
        sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
        fileName: doc.metadata.source,
      };
    }),
  );
};
