(() => {
  const _DEV_ = !!location.search.match(/dev/);

  const submitButton = document.getElementById("submit");
  const textInput = document.getElementById("text");
  const limitInput = document.getElementById("limit");
  const intervalInput = document.getElementById("interval");
  const superFastButton = document.getElementById("sfast");
  const fastButton = document.getElementById("fast");
  const nomalButton = document.getElementById("nomal");
  const slowButton = document.getElementById("slow");

  const getLimit = () => +limitInput.value || 3;
  const getInterval = () => +intervalInput.value || 500;
  const WAIT_TOKENS = [
    { token: "\n", time: getInterval() },
    { token: "。", time: getInterval() },
    { token: "．", time: getInterval() },
    { token: "？", time: getInterval() },
    { token: "！", time: getInterval() },
    { token: "…", time: getInterval() },
    { token: "‥", time: getInterval() },
    { token: "、", time: getInterval() / 2 },
    { token: ",", time: getInterval() / 2 },
    { token: "，", time: getInterval() / 2 },
    { token: "・", time: getInterval() / 2 },
  ];
  const WAIT_TOKENS_LIST = WAIT_TOKENS.map((x) => x.token);
  const WAIT_TOKENS_REGEX = new RegExp(WAIT_TOKENS_LIST.join("|"));
  const WAIT_TOKENS_REGEX_REPLACER = new RegExp(
    `(${WAIT_TOKENS_LIST.join("|")})`,
    "g"
  );

  let defaultText = "";
  let tokenizer = null;
  let isProcessing = false;
  let forceStop = false;

  const changeButtonText = (text) => (submitButton.innerText = text);

  const step = async (list, cb, ms) => {
    let res = [];
    let index = 0;
    for (const elm of list) {
      res.push(
        await new Promise((r) => {
          setTimeout(
            async () => {
              r(await cb(elm, index, list));
            },
            typeof ms === "function" ? ms(index) : ms
          );
        })
      );
      index++;
    }
    return res;
  };

  changeButtonText("読み込み中...");
  fetch("./defaultText.txt")
    .then((res) => res.text())
    .then((res) => {
      defaultText = res;
      kuromoji.builder({ dicPath: "./dict" }).build((e, k) => {
        if (e) throw e;
        tokenizer = k;
        submitButton.disabled = false;
        changeButtonText("[[ 決定 ]]");
      });
    });

  const optimizeText = (text) =>
    text
      .replace(/\n+/g, "\n")
      .split("\n")
      .map((x) => x.trim())
      .join("\n");

  const isEqualWaitTokens = (word) => WAIT_TOKENS_LIST.find((t) => t === word);

  const tokenize = (text) => {
    if (!tokenizer) return;
    // 無駄な空白や改行を省く
    const _text = optimizeText(text);
    // 字句解析して単語毎に区切る
    const tokenized = tokenizer
      .tokenize(_text.replace(/\s+/g, ""))
      .map(({ surface_form }) => surface_form);
    // 文字数が LIMIT に満たなければ次の単語を繋げる
    const { stock: connectedStock, result: connectedResult } = tokenized.reduce(
      ({ stock, result }, c) =>
        stock.length + c.length >= getLimit() || isEqualWaitTokens(c)
          ? isEqualWaitTokens(c)
            ? {
                stock: "",
                result: [
                  ...result.slice(0, -1),
                  ...(result.slice(-1) + stock + c)
                    .replace(WAIT_TOKENS_REGEX_REPLACER, "$1<>")
                    .split("<>")
                    .filter(Boolean),
                ],
              }
            : { stock: "", result: [...result, stock + c] }
          : { stock: stock + c, result },
      {
        stock: "",
        result: [],
      }
    );
    // 上の処理で connectedStock に残った文字列を繋ぐ
    const splited = [
      ...connectedResult,
      ...(connectedStock === "" ? [] : [connectedStock]),
      "",
    ];
    // 各文字列の表示スピードを決める
    const result = splited.map((text) => ({
      text,
      wait:
        (text.length / getLimit()) * getInterval() +
        (!text.match(WAIT_TOKENS_REGEX)
          ? 0
          : WAIT_TOKENS.filter(
              (t) => t.token === text.match(WAIT_TOKENS_REGEX)[0]
            )[0].time),
    }));

    _DEV_ && console.log(_text, tokenized, splited, result);
    return result;
  };

  submitButton.onclick = () => {
    if (isProcessing) {
      forceStop = true;
      isProcessing = false;
      changeButtonText("[[ 中止しました ]]");
      return;
    }
    changeButtonText("");
    isProcessing = true;
    const { value } = textInput;
    const result = tokenize(value || defaultText);
    step(
      result,
      (v) => {
        if (forceStop) {
          forceStop = false;
          throw "停止";
        }
        changeButtonText(v.text);
      },
      (i) => (i ? result[i - 1].wait : getInterval())
    )
      .then(() => {
        isProcessing = false;
        console.log({ result });
        changeButtonText("[[ 決定 ]]");
      })
      .catch((e) => {
        isProcessing = false;
        changeButtonText("[[ エラー発生 ]]");
        throw e;
      });
  };
  superFastButton.onclick = () => {
    limitInput.value = 4;
    intervalInput.value = 125;
  };
  fastButton.onclick = () => {
    limitInput.value = 3;
    intervalInput.value = 150;
  };
  nomalButton.onclick = () => {
    limitInput.value = 4;
    intervalInput.value = 200;
  };
  slowButton.onclick = () => {
    limitInput.value = 3;
    intervalInput.value = 500;
  };
})();
