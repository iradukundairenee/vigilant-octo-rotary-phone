import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import twilio from "twilio";
import gTTS from "google-tts-api";

const { twiml: twimlVoice } = twilio;

const app = express();

// ✅ Enable CORS for all origins
app.use(cors());

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const IVR_CONFIG = {
  welcomeMessage:
    "Welcome to the Safe Youth System. press 1 if you want to understand what safe you can help you deeply , press 2 if you want to avoid pregnancy, press 3 if you want to talk to an operator",
  mainMenuMessage: "Please press a number for the following options.",
  invalidMessage: "Invalid choice. Please try again.",
  goodbyeMessage: "Thank you for calling. Goodbye.",
  timeout: 5,
  options: [
    { key: "1", label: "Health Information", action: "health" },
    { key: "2", label: "Counseling and Support", action: "counseling" },
    { key: "3", label: "Operator", action: "operator" },
  ],
};

// 🔊 TTS endpoint
app.get("/tts", (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).send("Missing text");

  const url = gTTS.getAudioUrl(text, { lang: "en", slow: false });
  res.json({ url });
});

// ✅ Config endpoint
app.get("/config", (req, res) => res.json(IVR_CONFIG));

/**
 * 📞 IVR entry point – plays menu
 */
app.post("/ivr", (req, res) => {
  const response = new twimlVoice.VoiceResponse();

  const gather = response.gather({
    numDigits: 1,
    action: "/ivr/handle",
    method: "POST",
    timeout: IVR_CONFIG.timeout,
  });

  gather.say(IVR_CONFIG.welcomeMessage);
  gather.say(IVR_CONFIG.mainMenuMessage);

  IVR_CONFIG.options.forEach((opt) => {
    gather.say(`Press ${opt.key} for ${opt.label}.`);
  });

  // If no input, repeat the menu
  response.redirect("/ivr");

  res.type("text/xml");
  res.send(response.toString());
});

app.get("/ivr", (req, res) => {
  const response = new twimlVoice.VoiceResponse();

  const gather = response.gather({
    numDigits: 1,
    action: "/ivr/handle",
    method: "POST",
    timeout: IVR_CONFIG.timeout,
  });

  gather.say(IVR_CONFIG.welcomeMessage);
  gather.say(IVR_CONFIG.mainMenuMessage);

  IVR_CONFIG.options.forEach((opt) => {
    gather.say(`Press ${opt.key} for ${opt.label}.`);
  });

  response.redirect("/ivr");

  res.type("text/xml");
  res.send(response.toString());
});

/**
 * 🎯 Handle menu choice
 */
app.post("/ivr/handle", (req, res) => {
  const { Digits } = req.body; // Twilio sends pressed key
  const response = new twimlVoice.VoiceResponse();

  const option = IVR_CONFIG.options.find((opt) => opt.key === Digits);

  if (option) {
    if (option.action === "health") {
      response.say(
        "Safe Youth can help you by providing trusted information on health, relationships, and ways to stay safe. We guide young people to make good decisions and connect them with support when needed."
      );
    } else if (option.action === "counseling") {
      response.say(
        "To avoid early pregnancies, remember these key points: wait until you are ready, focus on your education, and avoid risky behaviors. If you are sexually active, always use protection and seek guidance from a health professional."
      );
    } else if (option.action === "operator") {
      response.say("Connecting you to the Safe Youth operator for more support.");
      response.dial("+25078xxxxxxx"); // operator’s number
    }
  } else {
    response.say(IVR_CONFIG.invalidMessage);
    response.redirect("/ivr"); // Repeat menu if invalid
  }

  res.type("text/xml");
  res.send(response.toString());
});

// ✅ Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`IVR backend running on http://localhost:${PORT}`);
});

