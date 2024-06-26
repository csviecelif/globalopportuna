document.addEventListener('DOMContentLoaded', function() {
    fetch("../cadastro/verificarsessao.php", {
        method: "GET",
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === false) {
            location.href = "../login/index.html";
        }
    })
    .catch(error => console.error('Erro ao verificar sessão:', error));

    const listaEmpregos = document.getElementById('jobList');

    if (!listaEmpregos) {
        console.error('Elemento jobList não encontrado');
        return;
    }

    fetch('buscar_empregos.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro na solicitação. Código de status: ' + response.status);
            }
            return response.json();
        })
        .then(empregos => {
            if (empregos.length > 0) {
                empregos.forEach(emprego => {
                    const empregoDiv = document.createElement('div');
                    empregoDiv.classList.add('job');
                    empregoDiv.innerHTML = `
                        <h2>${emprego.cargo} na ${emprego.nome_empresa}</h2>
                        <p><strong>País:</strong> ${emprego.pais_empresa}</p>
                        <p><strong>Setor:</strong> ${emprego.setor}</p>
                        <p><strong>Descrição da Vaga:</strong> ${emprego.descricao_vaga}</p>
                        <p><strong>Requisitos:</strong> ${emprego.requisitos_vaga}</p>
                        <p><strong>Salário:</strong> ${emprego.salario}</p>
                        <p><strong>Benefícios:</strong> ${emprego.beneficios}</p>
                        <p><strong>Endereço da Empresa:</strong> ${emprego.endereco_empresa}</p>
                        ${emprego.website_empresa ? `<p><strong>Website:</strong> <a href="${emprego.website_empresa}" target="_blank">${emprego.website_empresa}</a></p>` : ''}
                        ${emprego.redes_sociais_empresa ? `<p><strong>Redes Sociais:</strong> ${emprego.redes_sociais_empresa}</p>` : ''}
                        <p><strong>Data de Criação:</strong> ${new Date(emprego.criado_em).toLocaleDateString()}</p>
                        <button class="apply-button" onclick="mostrarCaixaResposta(${emprego.userId}, '${emprego.cargo}', this)">Aplicar para esta vaga</button>
                    `;
                    listaEmpregos.appendChild(empregoDiv);
                });
            } else {
                listaEmpregos.innerHTML = '<p>Nenhum emprego disponível no momento.</p>';
            }
        })
        .catch(error => console.error('Erro ao buscar empregos:', error));
});

function mostrarCaixaResposta(destinatarioId, cargo, botao) {
    const empregoDiv = botao.parentElement;
    let replyBox = empregoDiv.querySelector('.reply-box');
    
    if (!replyBox) {
        replyBox = document.createElement('div');
        replyBox.classList.add('reply-box');
        replyBox.innerHTML = `
            <textarea placeholder="Digite sua resposta aqui..."></textarea>
            <button class="send-button" onclick="enviarResposta(${destinatarioId}, this)">Enviar mensagem</button>
        `;
        empregoDiv.appendChild(replyBox);
    } else {
        replyBox.style.display = 'block';
    }
}

async function enviarResposta(destinatarioId, botao) {
    const replyBox = botao.parentElement;
    const mensagem = replyBox.querySelector('textarea').value;

    if (mensagem.trim() === '') {
        alert('A mensagem não pode estar vazia.');
        return;
    }

    try {
        const payload = await prepararDadosCriptografados({ destinatarioId, mensagem });

        fetch('enviar_mensagem.php', {
            method: 'POST',
            body: payload
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Mensagem enviada com sucesso!');
                replyBox.style.display = 'none';
            } else {
                alert('Erro ao enviar mensagem: ' + data.error);
            }
        })
        .catch(error => console.error('Erro ao enviar mensagem:', error));
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
    }
}

async function prepararDadosCriptografados(data) {
    const jsonObject = JSON.stringify(data);

    // Obtendo a chave pública do servidor
    const publicKey = await getPublicKeyFromServer();

    // Gerando chave secreta e IV
    const secretKey = CryptoJS.lib.WordArray.random(32).toString();
    const iv = CryptoJS.lib.WordArray.random(16).toString();

    // Criptografando a mensagem
    const encryptedMessage = CryptoJS.AES.encrypt(jsonObject, CryptoJS.enc.Hex.parse(secretKey), { iv: CryptoJS.enc.Hex.parse(iv) }).toString();

    // Criptografando a chave secreta com a chave pública
    const encryptedSecretKey = encryptSecretKey(secretKey, publicKey);

    const formData = new FormData();
    formData.append('iv', iv);
    formData.append('secretKey', encryptedSecretKey);
    formData.append('mensagem', encryptedMessage);

    console.log('Dados criptografados:', {
        iv: iv,
        secretKey: encryptedSecretKey,
        mensagem: encryptedMessage
    });

    return formData;
}

async function getPublicKeyFromServer() {
    const response = await fetch('../cert/public.key');
    const publicKey = await response.text();
    return publicKey;
}

function encryptSecretKey(secretKey, publicKey) {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey);
    return encrypt.encrypt(secretKey);
}
