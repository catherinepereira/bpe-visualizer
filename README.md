## BPE Visualizer

This project is heavily inspired by the [Tiktokenizer](https://tiktokenizer.vercel.app) tokenization playground, which implements OpenAI's [tiktoken](https://github.com/openai/tiktoken) tokenization.

This project currently implements the simplest BPE algorithm, but I plan to add a bit more to it to make it functionally identical to the modified BPE algorithm used in the GPT-2 tokenizer. Primarily, this is a visualization/educational tool, as I couldn't get the idea out of my head of how it would look to "step through" the BPE algorithm. No plans currently to support all of the tiktoken encodings.

### To-Do

- Add regex rules to match GPT-2 tokenization output
- Create and display vocab list for tokenized text
- Display merged UTF-8 encoded characters as new IDs in vocab
