import GPT3Tokenizer from "gpt3-tokenizer";

export interface Env {}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const text = await request.text();
    const encode = (text: string) =>
      new GPT3Tokenizer({
        type: "gpt3",
      }).encode(text).bpe;
    return new Response(String(encode(text).length));
  },
};
