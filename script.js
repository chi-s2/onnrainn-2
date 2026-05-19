const questions = [
  {
    text: "人から頼まれた作業をするとき、どれが一番安心して取り組めますか？",
    choices: [
      { text: "予定や資料を整理すること", type: "admin" },
      { text: "投稿内容や見せ方を考えること", type: "sns" },
      { text: "便利なツールを試して効率化すること", type: "ai" },
      { text: "文章を整えてわかりやすくすること", type: "writing" },
      { text: "数字や入出金を確認すること", type: "accounting" }
    ]
  },
  {
    text: "在宅ワークで大切にしたい働き方に近いものは？",
    choices: [
      { text: "決まった作業を丁寧に進めたい", type: "admin" },
      { text: "人の想いやサービスを広めたい", type: "sns" },
      { text: "新しい方法を学びながら成長したい", type: "ai" },
      { text: "落ち着いて文章に向き合いたい", type: "writing" },
      { text: "コツコツ正確に積み上げたい", type: "accounting" }
    ]
  },
  {
    text: "友人から相談されることが多い内容は？",
    choices: [
      { text: "予定管理や段取りのこと", type: "admin" },
      { text: "SNS投稿や写真の見せ方のこと", type: "sns" },
      { text: "アプリやAIツールの使い方のこと", type: "ai" },
      { text: "文章や言葉選びのこと", type: "writing" },
      { text: "家計やお金の管理のこと", type: "accounting" }
    ]
  },
  {
    text: "作業中に「楽しい」と感じやすいのは？",
    choices: [
      { text: "チェックリストを一つずつ終わらせる時間", type: "admin" },
      { text: "画像や文章を組み合わせて投稿を作る時間", type: "sns" },
      { text: "作業を短くする仕組みを見つける時間", type: "ai" },
      { text: "伝わる表現を考える時間", type: "writing" },
      { text: "数字がぴったり合う時間", type: "accounting" }
    ]
  },
  {
    text: "これから身につけたいスキルは？",
    choices: [
      { text: "メール対応やスケジュール管理", type: "admin" },
      { text: "Instagramや公式LINEの運用", type: "sns" },
      { text: "ChatGPTや自動化ツールの活用", type: "ai" },
      { text: "ブログやnote、メルマガの文章作成", type: "writing" },
      { text: "請求書や帳簿まわりの基本", type: "accounting" }
    ]
  },
  {
    text: "仕事相手から言われるとうれしい言葉は？",
    choices: [
      { text: "いつも丁寧で助かります", type: "admin" },
      { text: "発信の雰囲気が良くなりました", type: "sns" },
      { text: "作業がとても楽になりました", type: "ai" },
      { text: "言いたいことが伝わりやすくなりました", type: "writing" },
      { text: "安心して数字を任せられます", type: "accounting" }
    ]
  },
  {
    text: "苦手意識が少ないものはどれですか？",
    choices: [
      { text: "細かな確認や連絡", type: "admin" },
      { text: "流行や投稿ネタを見ること", type: "sns" },
      { text: "はじめてのツールを触ること", type: "ai" },
      { text: "文章を読んだり直したりすること", type: "writing" },
      { text: "表や数字を見ること", type: "accounting" }
    ]
  },
  {
    text: "最初のお仕事として挑戦しやすそうなのは？",
    choices: [
      { text: "メール返信や予約調整のサポート", type: "admin" },
      { text: "SNS投稿の下書きや予約投稿", type: "sns" },
      { text: "AIで資料作成や要約を手伝うこと", type: "ai" },
      { text: "記事やプロフィール文の作成補助", type: "writing" },
      { text: "領収書整理や請求書作成の補助", type: "accounting" }
    ]
  },
  {
    text: "あなたの強みに近いものは？",
    choices: [
      { text: "相手が困る前に気づきやすい", type: "admin" },
      { text: "雰囲気や世界観を大事にできる", type: "sns" },
      { text: "調べながら試すのが好き", type: "ai" },
      { text: "相手の気持ちを言葉にできる", type: "writing" },
      { text: "まじめに正確さを守れる", type: "accounting" }
    ]
  },
  {
    text: "半年後、どんな自分になっていたいですか？",
    choices: [
      { text: "信頼される縁の下の力持ちになりたい", type: "admin" },
      { text: "発信を支えるパートナーになりたい", type: "sns" },
      { text: "AIを味方にできる人になりたい", type: "ai" },
      { text: "文章で誰かの仕事を助けたい", type: "writing" },
      { text: "お金まわりを支えられる人になりたい", type: "accounting" }
    ]
  }
];

const results = {
  admin: {
    title: "事務サポートタイプ",
    copy: "あなたは、相手が安心して仕事を任せられる丁寧さが魅力です。予定管理、メール対応、資料整理など、オンライン秘書の基本業務から始めやすいタイプです。",
    steps: [
      "まずはGoogleカレンダー、Gmail、スプレッドシートの基本操作に慣れましょう。",
      "家事や予定管理の経験を、仕事で使える強みとして言葉にしてみましょう。",
      "最初はメール返信、予約調整、資料整理など小さな業務から実績を作るのがおすすめです。"
    ]
  },
  sns: {
    title: "SNS運用サポートタイプ",
    copy: "あなたは、雰囲気づくりや発信のサポートに向いています。Instagram、公式LINE、投稿文の下書きなど、個人起業家さんを支える仕事と相性が良さそうです。",
    steps: [
      "好きなSNSアカウントを見て、投稿の共通点をメモしてみましょう。",
      "Canvaで簡単な投稿画像を作り、練習用の作品を3つ用意しましょう。",
      "投稿作成、予約投稿、コメント確認など、初心者でも始めやすい業務から挑戦しましょう。"
    ]
  },
  ai: {
    title: "AI活用サポートタイプ",
    copy: "あなたは、新しいツールを味方にして仕事を効率化するのが得意になれるタイプです。ChatGPTでの文章作成、要約、資料のたたき台作りなどで活躍しやすいです。",
    steps: [
      "ChatGPTでメール文、投稿文、議事録要約を作る練習から始めましょう。",
      "AIが作った文章をそのまま使わず、やさしく自然な表現に整える練習をしましょう。",
      "AI活用が苦手な人の代わりに、下書き作成や情報整理を手伝う仕事を探してみましょう。"
    ]
  },
  writing: {
    title: "ライティングサポートタイプ",
    copy: "あなたは、想いや情報をわかりやすい言葉に整えるサポートに向いています。ブログ、note、メルマガ、プロフィール文など、文章まわりの仕事で力を発揮できます。",
    steps: [
      "まずは短い自己紹介文やサービス紹介文を書く練習をしてみましょう。",
      "読みやすい文章にするため、見出し、箇条書き、やさしい言葉選びを意識しましょう。",
      "文章の下書き、リライト、note記事の整理など、補助業務から始めるのがおすすめです。"
    ]
  },
  accounting: {
    title: "経理サポートタイプ",
    copy: "あなたは、コツコツ正確に進める仕事と相性が良いタイプです。領収書整理、請求書作成、入金確認など、事業者さんのお金まわりを支える仕事に向いています。",
    steps: [
      "まずは家計簿感覚で、収入と支出を表にまとめる練習をしましょう。",
      "請求書、領収書、会計ソフトの基本用語に少しずつ慣れていきましょう。",
      "最初は領収書整理や請求書作成の補助など、範囲が決まった業務から始めると安心です。"
    ]
  }
};

const typeScores = {
  admin: 0,
  sns: 0,
  ai: 0,
  writing: 0,
  accounting: 0
};

let currentQuestionIndex = 0;

const intro = document.getElementById("intro");
const quiz = document.getElementById("quiz");
const result = document.getElementById("result");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const questionCount = document.getElementById("questionCount");
const progressFill = document.getElementById("progressFill");
const questionText = document.getElementById("questionText");
const choices = document.getElementById("choices");
const resultTitle = document.getElementById("resultTitle");
const resultCopy = document.getElementById("resultCopy");
const resultSteps = document.getElementById("resultSteps");
const lineButton = document.getElementById("lineButton");
const noteButton = document.getElementById("noteButton");

const links = {
  line: "https://lin.ee/your-line-url",
  note: "https://note.com/your-note-url"
};

function startQuiz() {
  resetScores();
  currentQuestionIndex = 0;
  intro.classList.add("hidden");
  result.classList.add("hidden");
  quiz.classList.remove("hidden");
  showQuestion();
}

function resetScores() {
  Object.keys(typeScores).forEach((type) => {
    typeScores[type] = 0;
  });
}

function showQuestion() {
  const question = questions[currentQuestionIndex];
  const displayIndex = currentQuestionIndex + 1;

  questionCount.textContent = `${displayIndex} / ${questions.length}`;
  progressFill.style.width = `${(displayIndex / questions.length) * 100}%`;
  questionText.textContent = question.text;
  choices.innerHTML = "";

  question.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = choice.text;
    button.addEventListener("click", () => selectChoice(choice.type));
    choices.appendChild(button);
  });
}

function selectChoice(type) {
  typeScores[type] += 1;
  currentQuestionIndex += 1;

  if (currentQuestionIndex < questions.length) {
    showQuestion();
    return;
  }

  showResult();
}

function showResult() {
  const winningType = Object.entries(typeScores).sort((a, b) => b[1] - a[1])[0][0];
  const resultData = results[winningType];

  resultTitle.textContent = resultData.title;
  resultCopy.textContent = resultData.copy;
  resultSteps.innerHTML = "";

  resultData.steps.forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    resultSteps.appendChild(item);
  });

  lineButton.href = links.line;
  noteButton.href = links.note;

  quiz.classList.add("hidden");
  result.classList.remove("hidden");
}

startButton.addEventListener("click", startQuiz);
restartButton.addEventListener("click", startQuiz);
