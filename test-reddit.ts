import { fetchRedditThreads, analyzeRedditOpportunity } from './src/server/services/reddit';

async function main() {
  const threads = await fetchRedditThreads("SaaS Marketing", 2);
  console.log("Fetched threads:", threads.length);
  if (threads.length > 0) {
      const evalResult = await analyzeRedditOpportunity(threads[0], "AutoRank");
      console.log(evalResult);
  }
}

main().catch(console.error);
