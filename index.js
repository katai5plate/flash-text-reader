const LIMIT = 4;

let defaultText = "";
let tokenizer = null;
let isProcessing = false;
const button = document.getElementById("submit");
const input = document.getElementById("text");

const changeButtonText = (text) => (button.innerText = text);

const step = async (list, cb, ms) => {
  let res = [];
  let index = 0;
  for (const elm of list) {
    index++;
    res.push(
      await new Promise((r) => {
        setTimeout(async () => {
          r(await cb(elm, index, list));
        }, ms);
      })
    );
  }
  return res;
};

changeButtonText("読み込み中...");
fetch("./README.md")
  .then((res) => res.text())
  .then((res) => {
    defaultText = res;
    kuromoji.builder({ dicPath: "./dict" }).build((e, k) => {
      if (e) throw e;
      tokenizer = k;
      button.disabled = false;
      changeButtonText("[[ 決定 ]]");
    });
  });

const tokenize = (text) => {
  if (!tokenizer) return;
  const { stock, result } = tokenizer
    .tokenize(text.replace(/\s+/g, ""))
    .map(({ surface_form }) => surface_form)
    .reduce(
      ({ stock, result }, c) =>
        stock.length + c.length >= LIMIT
          ? { stock: "", result: [...result, stock + c] }
          : { stock: stock + c, result },
      {
        stock: "",
        result: [],
      }
    );
  return [...result, ...(stock === "" ? [] : [stock])];
};

button.onclick = () => {
  if (isProcessing) return;
  changeButtonText("");
  isProcessing = true;
  const { value } = input;
  const result = tokenize(value || defaultText);
  step([...result, ""], (v) => changeButtonText(v), 500)
    .then(() => {
      isProcessing = false;
      console.log({ result });
      changeButtonText("[[ 決定 ]]");
    })
    .catch((e) => {
      isProcessing = false;
      changeButtonText("エラーが発生しました");
      throw e;
    });
};
