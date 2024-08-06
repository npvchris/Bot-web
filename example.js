const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Armazenar estado do usuário
const userStates = {};

// Criação do cliente
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Função para enviar áudio de boas-vindas
async function sendWelcomeAudio(message) {
    const audio = MessageMedia.fromFilePath('atendimento.mp3');
    await message.reply(audio);
}

// Função para enviar tabela de preços
async function sendPriceTable(message, filePath) {
    const priceTable = fs.readFileSync(filePath, 'utf-8');
    await message.reply(priceTable);
}

// Função para tratar a resposta do setor
async function handleSectorResponse(message, option, msg, chatId) {
    const youtubeLiveLink = 'https://www.youtube.com/live?app=desktop&gl=BR&hl=pt';
    let state = userStates[chatId];

    if (option === '1' || option === '2') {
        await message.reply(`Agora você será atendido pelo nosso atendente o mais rápido possível. Enquanto isso, assista uma live no canal oficial: ${youtubeLiveLink}`);
        state.currentStep = 'completed';
    } else if (option === '3') {
        // Processar informações de assistência técnica
        await message.reply(`Agora você será atendido pelo nosso atendente o mais rápido possível. Enquanto isso, assista uma live no canal oficial: ${youtubeLiveLink}`);
        state.currentStep = 'completed';
    } else if (option === '4') {
        // Processar informações de garantia
        await message.reply(`Agora você será atendido pelo nosso atendente o mais rápido possível. Enquanto isso, assista uma live no canal oficial: ${youtubeLiveLink}`);
        state.currentStep = 'completed';
    }
}

// Função para enviar inquérito de feedback
async function sendFeedbackSurvey(message) {
    await message.reply("Por favor, avalie nosso atendimento de 5 a 1 estrela.");
}

// Função para enviar quiz interativo
async function sendQuiz(message) {
    await message.reply("Gostaria de participar de um quiz interativo sobre tecnologia e celulares? Responda 'sim' ou 'não'.");
}

// Função para lidar com as respostas do quiz
async function handleQuizResponse(message, msg, chatId) {
    const quizQuestions = [
        {
            question: "Qual foi o primeiro smartphone da Apple?",
            answer: "iphone"
        },
        {
            question: "Qual empresa desenvolveu o sistema operacional Android?",
            answer: "google"
        },
        // Adicione mais perguntas conforme necessário
    ];

    let state = userStates[chatId];

    if (!state.quiz) {
        state.quiz = {
            currentQuestion: 0,
            score: 0
        };
    }

    let quizState = state.quiz;

    if (msg === 'sim') {
        await message.reply(`Vamos começar o quiz! ${quizQuestions[quizState.currentQuestion].question}`);
        quizState.currentQuestion++;
    } else if (msg === 'não') {
        await message.reply("Obrigado pelo seu tempo! Agradecemos a sua participação.");
        state.currentStep = 'completed';
    } else {
        if (quizState.currentQuestion <= quizQuestions.length) {
            let correctAnswer = quizQuestions[quizState.currentQuestion - 1].answer.toLowerCase();

            if (msg === correctAnswer) {
                quizState.score += 10;
                await message.reply("Resposta correta! 🏆");
            } else {
                quizState.score += 5;
                await message.reply("Resposta errada. 😔");
            }

            if (quizState.currentQuestion < quizQuestions.length) {
                await message.reply(quizQuestions[quizState.currentQuestion].question);
                quizState.currentQuestion++;
            } else {
                await message.reply(`Quiz finalizado! Sua pontuação foi: ${quizState.score} moedas.`);
                state.currentStep = 'completed';
            }
        }
    }
}

// Função para tratar as mensagens do usuário
async function handleUserMessage(message) {
    const chatId = message.from;
    const msg = message.body.toLowerCase().trim();
    let state = userStates[chatId];

    if (!state) {
        state = {
            currentStep: 'initial'
        };
        userStates[chatId] = state;
    }

    if (state.currentStep === 'initial') {
        const contact = await message.getContact();
        const nome = contact.pushname || contact.verifiedName || "Cliente";
        await message.reply(`👋 Olá, ${nome}! Seja bem-vindo!`);
        await sendWelcomeAudio(message);
        await message.reply("👋 Olá! Bem-vindo! Como posso ajudá-lo hoje? Escolha uma das opções:\n\n1️⃣ Vendas de aparelhos Apple\n2️⃣ Vendas de aparelhos Xiaomi\n3️⃣ Assistência Técnica Especializada\n4️⃣ Suporte Garantia\n5️⃣ Falar com atendente");
        state.currentStep = 'awaiting_option';
    } else if (state.currentStep === 'awaiting_option') {
        if (['1', '2', '3', '4', '5'].includes(msg)) {
            state.option = msg;
            await handleSectorOption(message, msg, chatId);
        } else {
            await message.reply("Por favor, escolha uma das opções:\n\n1️⃣ Vendas de aparelhos Apple\n2️⃣ Vendas de aparelhos Xiaomi\n3️⃣ Assistência Técnica Especializada\n4️⃣ Suporte Garantia\n5️⃣ Falar com atendente");
        }
    } else if (state.currentStep === 'awaiting_response') {
        await handleSectorResponse(message, state.option, msg, chatId);
    } else if (state.currentStep === 'awaiting_warranty_info') {
        await message.reply(`Agora você será atendido pelo nosso atendente o mais rápido possível. Enquanto isso, assista uma live no canal oficial: https://www.youtube.com/live?app=desktop&gl=BR&hl=pt`);
        state.currentStep = 'completed';
    } else if (state.currentStep === 'awaiting_feedback') {
        await sendFeedbackSurvey(message);
        state.currentStep = 'completed';
    } else if (state.currentStep === 'awaiting_quiz') {
        await handleQuizResponse(message, msg, chatId);
    } else {
        await message.reply("Não entendi sua mensagem. Por favor, escolha uma das opções:\n\n1️⃣ Vendas de aparelhos Apple\n2️⃣ Vendas de aparelhos Xiaomi\n3️⃣ Assistência Técnica Especializada\n4️⃣ Suporte Garantia\n5️⃣ Falar com atendente");
    }
}

// Atualize o cliente para usar a função handleUserMessage
client.on('message', handleUserMessage);

// Função para tratar as opções de setor
async function handleSectorOption(message, option, chatId) {
    let state = userStates[chatId];

    switch (option) {
        case '1':
            await message.reply("📜 Segue nossa tabela de preços com todos nossos aparelhos Apple Novos e semi Novos, abra e escolha o seu e mande aqui!");
            await sendPriceTable(message, 'Apple.txt');
            state.currentStep = 'awaiting_response';
            break;
        case '2':
            await message.reply("📜 Segue nossa tabela de preços com todos nossos aparelhos Xiaomi Novos, abra e escolha o seu e mande aqui!");
            await sendPriceTable(message, 'Xiaomi.txt');
            state.currentStep = 'awaiting_response';
            break;
        case '3':
            await message.reply("🔧 Por favor, informe a Marca, Modelo e o tipo de serviço para reparo.");
            state.currentStep = 'awaiting_response';
            break;
        case '4':
            await message.reply("📋 Por favor, informe o modelo do aparelho, IMEI, data da compra, nome completo e número do pedido.");
            state.currentStep = 'awaiting_response';
            break;
        case '5':
            await handleImmediateAssistance(message);
            state.currentStep = 'awaiting_feedback';
            break;
    }
}

// Função para tratar a assistência imediata
async function handleImmediateAssistance(message) {
    const archivedMessages = "Mensagens arquivadas"; // Placeholder para as mensagens arquivadas
    await message.reply(archivedMessages);
    await sendFeedbackSurvey(message);
}

// Iniciar o cliente
client.initialize();
