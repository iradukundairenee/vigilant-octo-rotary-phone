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
    "Murakaza neza muri sisitemu ya Safe Youth. Kanda 1 niba ushaka kumva uko Safe Youth ishobora kugufasha cyane, kanda 2 niba ushaka kwirinda inda, kanda 3 niba ushaka kuvuga n'umukozi",
  mainMenuMessage: "Nyamuneka kanda nimero y'amahitamo akurikira.",
  invalidMessage: "Icyo wahisemo ntibikwiye. Ongera ugerageze.",
  goodbyeMessage: "Murakoze guhamagara. Muramuke.",
  timeout: 5,
  options: [
    { key: "1", label: "Amakuru y'Ubuzima", action: "health" },
    { key: "2", label: "Ubujyanama n'Ubufasha", action: "counseling" },
    { key: "3", label: "Umukozi", action: "operator" },
  ],
  choices: {
    '1': "Safe Youth irashobora kugufasha mu gutanga amakuru yizewe ku buzima, ku mibanire, n'uburyo bwo kwirinda. Duyobora urubyiruko gufata ibyemezo byiza no kubahuza n'ubufasha igihe bakeneye.",
    '2': "Kugirango wirinde inda mbere y'igihe, ibuka ingingo z'ingenzi: tegereza uko uteguye, wibanze ku masomo yawe, kandi wirinde imyitwarire ishobora kuguteza ingorane. Niba uri mu gufatana n'umuntu, buri gihe koresha ibikurinda kandi ushake ubuyobozi bw'inzobere z'ubuzima.",
    '3': "Turakunganira kuri operator wa Safe Youth kugirango ubone ubundi bufasha. Tegereza uko tuguha telefoni."
  }
};

// 🔊 TTS endpoint with language support
app.get("/tts", (req, res) => {
  const { text, lang = 'rw' } = req.query; // Default to Kinyarwanda
  if (!text) return res.status(400).send("Missing text");

  try {
    // Note: Google TTS might not support Kinyarwanda directly
    // You might need to use 'en' as fallback or use a different TTS service
    const language = lang === 'rw' ? 'en' : lang; // Fallback to English for now
    const url = gTTS.getAudioUrl(text, { lang: language, slow: false });
    res.json({ url });
  } catch (error) {
    console.error("TTS Error:", error);
    // Fallback to English if Kinyarwanda fails
    const url = gTTS.getAudioUrl(text, { lang: 'en', slow: false });
    res.json({ url });
  }
});

// ✅ Config endpoint
app.get("/config", (req, res) => res.json(IVR_CONFIG));

/**
 * 📞 IVR entry point – plays menu in Kinyarwanda
 */
app.post("/ivr", (req, res) => {
  const response = new twimlVoice.VoiceResponse();

  const gather = response.gather({
    numDigits: 1,
    action: "/ivr/handle",
    method: "POST",
    timeout: IVR_CONFIG.timeout,
  });

  gather.say(IVR_CONFIG.welcomeMessage, { language: 'en' }); // Twilio doesn't support Kinyarwanda
  gather.say(IVR_CONFIG.mainMenuMessage, { language: 'en' });

  IVR_CONFIG.options.forEach((opt) => {
    gather.say(`Kanda ${opt.key} kuri ${opt.label}.`, { language: 'en' });
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

  gather.say(IVR_CONFIG.welcomeMessage, { language: 'en' });
  gather.say(IVR_CONFIG.mainMenuMessage, { language: 'en' });

  IVR_CONFIG.options.forEach((opt) => {
    gather.say(`Kanda ${opt.key} kuri ${opt.label}.`, { language: 'en' });
  });

  response.redirect("/ivr");

  res.type("text/xml");
  res.send(response.toString());
});

/**
 * 🎯 Handle menu choice in Kinyarwanda
 */
app.post("/ivr/handle", (req, res) => {
  const { Digits } = req.body; // Twilio sends pressed key
  const response = new twimlVoice.VoiceResponse();

  const option = IVR_CONFIG.options.find((opt) => opt.key === Digits);

  if (option) {
    if (option.action === "health") {
      response.say(IVR_CONFIG.choices['1'], { language: 'en' });
    } else if (option.action === "counseling") {
      response.say(IVR_CONFIG.choices['2'], { language: 'en' });
    } else if (option.action === "operator") {
      response.say(IVR_CONFIG.choices['3'], { language: 'en' });
      response.dial("+25078xxxxxxx"); // operator's number
    }
  } else {
    response.say(IVR_CONFIG.invalidMessage, { language: 'en' });
    response.redirect("/ivr"); // Repeat menu if invalid
  }

  res.type("text/xml");
  res.send(response.toString());
});

// ✅ Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`IVR backend running on http://localhost:${PORT}`);
  console.log(`Supporting Kinyarwanda language`);
});
