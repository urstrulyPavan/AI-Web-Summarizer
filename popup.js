document.getElementById('summarizeBtn').addEventListener('click', function () {
  const button = document.getElementById('summarizeBtn');
  button.innerText = "Analyzing page with AI...";
  button.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];

    chrome.tabs.sendMessage(activeTab.id, { action: "RUN_SUMMARIZE" }, function (response) {
      button.innerText = "Summarize Current Page";
      button.disabled = false;

      if (!response) {
        alert("Please refresh the target web page and try again.");
        return;
      }

      // Populate statistics
      document.getElementById('wordCount').innerText = response.totalWords.toLocaleString();
      document.getElementById('speed').innerText = response.wordsPerSecond.toLocaleString();
      document.getElementById('timeMs').innerText = response.timeTakenMs;

      // Populate AI Summary
      document.getElementById('summaryBox').innerText = response.summary;

      // Render AI Q&As
      const quizContainer = document.getElementById('quizBox');
      quizContainer.innerHTML = "";

      if (!response.quiz || response.quiz.length === 0) {
        quizContainer.innerText = "No quiz questions generated.";
      } else {
        for (let i = 0; i < response.quiz.length; i++) {
          const item = response.quiz[i];

          const quizItemDiv = document.createElement('div');
          quizItemDiv.className = "quiz-item";

          const qText = document.createElement('div');
          qText.className = "quiz-question";
          qText.innerText = "Q" + item.id + ": " + item.question;

          const aText = document.createElement('div');
          aText.className = "quiz-answer";
          aText.innerText = "A: " + item.answer;

          quizItemDiv.appendChild(qText);
          quizItemDiv.appendChild(aText);
          quizContainer.appendChild(quizItemDiv);
        }
      }

      document.getElementById('results').classList.remove('hidden');
    });
  });
});