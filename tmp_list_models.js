const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
  try {
    const genAI = new GoogleGenerativeAI('AIzaSyCU5C5S4XCVlVRCs4-lKd8Xkubtk42yNI4');
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCU5C5S4XCVlVRCs4-lKd8Xkubtk42yNI4');
    const data = await response.json();
    console.log(data.models.map(m => m.name).join('\n'));
  } catch(e) {
    console.error(e);
  }
}
run();
