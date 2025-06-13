// backend/index.js (Node/Express)
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// Ensure profiles directory exists
const profilesDir = path.join(__dirname, 'profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir);
}

// Helper function to create a safe file name (ID) from profile name
function profileIdFromName(name) {
  // Replace any non-alphanumeric characters with underscores
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

// Endpoint: Create a new profile
app.post('/api/profiles', (req, res) => {
  const profileName = req.body.name;
  if (!profileName) {
    return res.status(400).json({ error: "Name is required" });
  }
  const id = profileIdFromName(profileName);
  const filePath = path.join(profilesDir, `${id}.json`);
  if (fs.existsSync(filePath)) {
    return res.status(400).json({ error: "Profile already exists" });
  }
  // Initialize profile JSON data
  const profileData = { id: id, name: profileName, files: [] };
  fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2));
  return res.json(profileData);
});

app.put('/api/profiles/:id/files/:index', (req, res) => {
  const { id, index } = req.params;
  const filePath = path.join(profilesDir, `${id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Profile not found" });

  const profile = JSON.parse(fs.readFileSync(filePath));
  if (!profile.files[index]) return res.status(404).json({ error: "File not found" });

  // Allow editing date, tags, title
  const { date, tags, title } = req.body;
  if (date) profile.files[index].date = date;
  if (tags) profile.files[index].tags = tags;
  if (title) profile.files[index].title = title;

  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
  res.json(profile.files[index]);
});

app.get('/api/profiles/:id/compile', (req, res) => {
  const profileId = req.params.id;
  const filePath = path.join(profilesDir, `${profileId}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const profileData = JSON.parse(fs.readFileSync(filePath));
  const files = profileData.files.sort((a, b) => new Date(a.date) - new Date(b.date));

  const includeAI = req.query.includeAI === 'true';
  const format = req.query.format || '1';

  // Start PDF response
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${profileId}_compiled.pdf"`);
  doc.pipe(res);

  if (includeAI) {
  const aiCommand = `
⚠️ AI INSTRUCTION: You are now acting as the uploaded macroeconomic profile.

🎭 Persona Emulation Protocol:
- You are ${profileData.name}. Fully adopt their worldview, communication style, and rhetorical habits.
- Write and speak *exactly* like they do in videos, interviews, and writings.
- Emulate specific tone, pacing, energy, sentence structure, and signature expressions.
- Use idioms, slang, jokes, or phrases commonly associated with them.
- If transcripts include typical intros (e.g. "Hello fellow Rebel Capitalists!" or "Welcome to another macro breakdown"), **start your first answer with that exact intro**.
- Do not explain your persona. **Be them. Instantly.**

🧠 Memory Instruction:
- Assume the content in this document represents your knowledge base. You lived it. You said it. You believe it.
- Quote from it, summarize it, reference it with confidence. Never say "the document says..." — it’s *your view*.

👋 First Answer Format:
- Begin the conversation as if you’re recording a new episode, interview, or post — *start in-character*.
  - Example (George Gammon): “Hello fellow Rebel Capitalists! Let’s dive into some macro madness. Hit me with your questions.”

- Immediately ask for the user’s question without breaking character:
  - ✅ “What’s your first macro question?”
  - ❌ Never say “How can I help you as George Gammon?”

🗂️ Answer Style Preference (based on user input):
- **Format 1**: Löpande text — full paragraphs, emotional tone, persuasive.
- **Format 2**: Punktform — snappy bullets, straight to the takeaway.
- **Format 3**: Expertstruktur — teach like a professor, structured in levels or branches (e.g., If A → then B/C).

🔒 Behavior Rules:
- NEVER step out of character.
- NEVER explain what you’re doing as an AI.
- NEVER include disclaimers or meta-comments.
- NEVER refer to the instructions or that you're following commands.

🎯 Objective:
Provide bold, authentic, unfiltered macroeconomic insight — as if the real ${profileData.name} were having a real-time dialogue with the user.

🛑 End of instructions.
`;
  doc.fontSize(12).text(aiCommand);
}



  files.forEach(file => {
    doc.moveDown();
    doc.fontSize(12).text(`${file.title} (${file.date.split('T')[0]} - ${file.type})`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(file.content || "");
    doc.moveDown();
  });

  doc.end();
});


// Endpoint: Get list of all profiles
app.get('/api/profiles', (req, res) => {
  let profileList = [];
  try {
    const files = fs.readdirSync(profilesDir).filter(fn => fn.endsWith('.json'));
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(profilesDir, file)));
      profileList.push({ id: data.id, name: data.name });
    }
  } catch (err) {
    console.error("Failed to list profiles:", err);
  }
  res.json(profileList);
});

// Endpoint: Get data for a single profile (its files metadata)
app.get('/api/profiles/:id', (req, res) => {
  const profileId = req.params.id;
  const filePath = path.join(profilesDir, `${profileId}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Profile not found" });
  }
  const profileData = JSON.parse(fs.readFileSync(filePath));
  res.json(profileData);
});

// Setup multer for file uploads (memory storage to handle files in RAM)
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint: Upload files to a profile
app.post('/api/profiles/:id/files', upload.array('files'), async (req, res) => {
  const profileId = req.params.id;
  const filePath = path.join(profilesDir, `${profileId}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Profile not found" });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  // Load current profile data
  let profileData = JSON.parse(fs.readFileSync(filePath));
  for (const file of req.files) {
    try {
      const originalName = file.originalname;
      // Determine file type from extension
      const ext = path.extname(originalName).toLowerCase();
      let fileType;
      if (ext === '.pdf') fileType = 'PDF';
      else if (ext === '.docx' || ext === '.doc') fileType = 'DOCX';
      else if (ext === '.txt') fileType = 'TXT';
      else {
        fileType = 'OTHER';
      }
      // Extract text content based on file type
      let textContent = "";
      if (fileType === 'PDF') {
        const data = await pdfParse(file.buffer);
        textContent = data.text;
      } else if (fileType === 'DOCX') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        textContent = result.value;
      } else if (fileType === 'TXT') {
        textContent = file.buffer.toString('utf-8');
      } else {
        // Skip unsupported file types
        textContent = "";
      }
      // Use file name (without extension) as title
      const title = originalName.replace(/\.[^/.]+$/, "");
      const now = new Date();
      const metadata = {
        title: title,
        date: now.toISOString(),
        type: fileType,
        tags: req.body.tags || [], // ← expects array of strings
        content: textContent
      };
      profileData.files.push(metadata);
    } catch (err) {
      console.error("Error processing file:", file.originalname, err);
    }
  }
  // (Optionally, sort files by date here if desired)
  // profileData.files.sort((a, b) => new Date(a.date) - new Date(b.date));
  // Save updated profile JSON
  fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2));
  res.json(profileData);  // return updated profile data (including new files)
});

app.delete('/api/profiles/:id/files/:index', (req, res) => {
  const { id, index } = req.params;
  const filePath = path.join(profilesDir, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const profileData = JSON.parse(fs.readFileSync(filePath));
  if (!profileData.files[index]) {
    return res.status(404).json({ error: "File not found" });
  }

  profileData.files.splice(index, 1); // remove 1 file at index
  fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2));
  res.json({ success: true });
});


// Endpoint: Compile all files of a profile into one PDF
app.get('/api/profiles/:id/compile', (req, res) => {
  const profileId = req.params.id;
  const filePath = path.join(profilesDir, `${profileId}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Profile not found" });
  }
  const profileData = JSON.parse(fs.readFileSync(filePath));
  const files = profileData.files;
  // Sort files by date ascending
  files.sort((a, b) => new Date(a.date) - new Date(b.date));
  // Create a PDF document and stream it to response
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${profileId}_compiled.pdf"`);
  doc.pipe(res);
  // Add AI command at beginning
  doc.fontSize(12).text("<< AI COMMAND START >>\n", { bold: true });
  // Add each file's content with its metadata
  files.forEach(file => {
    doc.moveDown();  // blank line
    // Title and date
    doc.fontSize(12).text(`${file.title} (${file.date.split('T')[0]} - ${file.type})`, { underline: true });
    doc.moveDown(0.5);
    // File content
    doc.fontSize(11).text(file.content);
    doc.moveDown();
  });
  // Add AI command at end
  doc.fontSize(12).text("\n<< AI COMMAND END >>", { bold: true });
  doc.end();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
