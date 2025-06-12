import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';


const app = express();
const PORT = 4000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

const users = [
    { id: uuidv4(), name: 'Admin', email: 'admin@gmail.com', password: 'qwerty', type: 'admin' },
    { id: uuidv4(), name: 'User', email: 'user@gmail.com', password: '1234567890', type: 'individual' },
    { id: uuidv4(), name: 'Individual', email: 'individual@gmail.com', password: '1234567890', type: 'individual' },
    { id: uuidv4(), name: 'Business', email: 'business@gmail.com', password: '1234567890', type: 'business' }
];

const problems = [];


// Avtorizatsiya APIlari
app.post('/register', (req, res) => {
    const { name, email, password, type } = req.body;

    // Validate input
    if (!name || !email || !password || !type) {
        return res.status(400).json({ message: "Barcha maydonlarni to'ldiring!" });
    }
    if (!['individual', 'business'].includes(type)) {
        return res.status(400).json({ message: "Noto'g'ri foydalanuvchi turi! Faqat 'individual' yoki 'business' bo'lishi mumkin." });
    }
    if (users.some(user => user.email === email)) {
        return res.status(400).json({ message: "Bu email allaqachon ro'yxatdan o'tgan!" });
    }

    // Create and store new user
    const newUser = { id: uuidv4(), name, email, password, type };
    users.push(newUser);
    console.log('Yangi foydalanuvchi:', newUser);

    // Return user data
    res.status(201).json({
        message: "Ro'yxatdan muvaffaqiyatli o'tdingiz!",
        user: { id: newUser.id, name: newUser.name, email: newUser.email, type: newUser.type }
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: "Email va parol kiritilishi kerak!" });
    }

    // Find user
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ message: "Email yoki parol noto'g'ri!" });
    }

    console.log("Foydalanuvchi tizimga kirdi:", user.name);

    // Return user data
    res.status(200).json({
        message: "Tizimga muvaffaqiyatli kirdingiz!",
        user: { id: user.id, name: user.name, email: user.email, type: user.type }
    });
});

// Foydalanuvchining APIlari
app.post('/request', (req, res) => {
    const { title, description, category, userId } = req.body;

    // Validate input
    if (!title || !description || !category || !userId) {
        return res.status(400).json({ message: "Barcha maydonlarni to'ldiring!" });
    }
    if (!['texnik', 'hisob', 'boshqa'].includes(category)) {
        return res.status(400).json({ message: "Noto'g'ri kategoriya! Faqat 'texnik', 'hisob' yoki 'boshqa' bo'lishi mumkin." });
    }

    // Validate user
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(400).json({ message: "Foydalanuvchi topilmadi!" });
    }

    // Create and store new request
    const newRequest = { id: uuidv4(), title, description, category, userId, status: 'open', createdAt: new Date() };
    problems.push(newRequest);
    console.log('Yangi so\'rov:', newRequest);

    // Return request data
    res.status(201).json({
        message: "So'rov muvaffaqiyatli yuborildi!",
        request: newRequest
    });
});

app.post('/problems', (req, res) => {
    const { userId } = req.body;

    // Validate input
    if (!userId) {
        return res.status(400).json({ message: "Foydalanuvchi ID kiritilishi kerak!" });
    }

    // Validate user
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(400).json({ message: "Foydalanuvchi topilmadi!" });
    }

    // Filter problems by userId
    const userProblems = problems.filter(p => p.userId === userId);
    console.log('Foydalanuvchi so\'rovlari:', userProblems);

    // Return problems
    res.status(200).json({
        message: "So'rovlar muvaffaqiyatli olingan!",
        problems: userProblems
    });
});

// Adminning APIlari
app.post('/all', (req, res) => {
    const { userId } = req.body;

    // Validate input
    if (!userId) {
        return res.status(400).json({ message: "Foydalanuvchi ID kiritilishi kerak!" });
    }

    // Validate admin
    const user = users.find(u => u.id === userId);
    if (!user || user.type !== 'admin') {
        return res.status(403).json({ message: "Faqat admin barcha so'rovlarni ko'rishi mumkin!" });
    }

    // Return all problems
    console.log('Barcha so\'rovlar:', problems);
    res.status(200).json({
        message: "Barcha so'rovlar muvaffaqiyatli olingan!",
        problems
    });
});

app.post('/reply', (req, res) => {
    const { problemId, reply, userId } = req.body;

    // Validate input
    if (!problemId || !reply || !userId) {
        return res.status(400).json({ message: "Barcha maydonlarni to'ldiring!" });
    }

    // Validate admin
    const user = users.find(u => u.id === userId);
    if (!user || user.type !== 'admin') {
        return res.status(403).json({ message: "Faqat admin javob yuborishi mumkin!" });
    }

    // Find and validate problem
    const problem = problems.find(p => p.id === problemId);
    if (!problem) {
        return res.status(404).json({ message: "So'rov topilmadi!" });
    }
    if (problem.status === 'closed') {
        return res.status(400).json({ message: "Bu so'rov allaqachon yopilgan!" });
    }

    // Add reply and close problem
    problem.reply = reply;
    problem.status = 'closed';
    problem.replyUserId = userId; // Store admin ID
    problem.replyCreatedAt = new Date(); // Store reply timestamp
    console.log('Javob qo\'shildi:', problem);

    // Return updated problem
    res.status(200).json({
        message: "Javob muvaffaqiyatli yuborildi!",
        problem
    });
});

// Xatolikni boshqarish
app.use((req, res, next, error) => {
    console.error(error);
    res.status(500).send('Ichki server xatosi');
})


// Serverni ishga tushirish
app.listen(PORT, () => {
    console.log(`Server ishga tushirildi: http://localhost:${PORT}`);
});
