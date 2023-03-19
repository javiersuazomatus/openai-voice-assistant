/* FLOATING RECORD BUTTON */

let recordButton;

// Variables para almacenar el objeto MediaRecorder y los datos grabados
let mediaRecorder;
let chunks = [];

// Verificar si la URL contiene 'mercadolibre'
if (window.location.href.includes('mercadolibre')) {
  addButtontoDOM();
}

function addButtontoDOM() {
  recordButton = document.createElement('div');
  recordButton.style.position = 'fixed';
  recordButton.style.top = '28px';
  recordButton.style.right = '48px';
  recordButton.style.width = '48px',
  recordButton.style.height = '48px',
  recordButton.style.zIndex = '9999';
  recordButton.style.backgroundImage = `url(${chrome.runtime.getURL('./micro-48.png')})`;

  // Insertar el botón en el DOM
  document.body.appendChild(recordButton);

  // Evento de click en el botón
  recordButton.addEventListener('click', handleRecord );
}

function handleRecord() {
  // Si no se está grabando, comenzar la grabación
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    changeStatusToRecordButton('recording');
    startRecord();
  } else {
    stopAndCleanRecord();
    changeStatusToRecordButton('enabled');
  }
}

function changeStatusToRecordButton(status) {
  const change = {
    enabled: function() {
      recordButton.style.backgroundImage = `url(${chrome.runtime.getURL('./micro-48.png')})`;
      recordButton.disabled = false;
    },
    recording: function() {
      recordButton.style.backgroundImage = `url(${chrome.runtime.getURL('./micro-red-48.png')})`;
      recordButton.disabled = false;
    },
    waiting: function() {
      recordButton.style.backgroundImage = `url(${chrome.runtime.getURL('./micro-await-48.png')})`;
      recordButton.disabled = true;
    }
  }
  change[status]();
}

function startRecord() {  
  // Solicitar acceso al micrófono
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
      // Crear un objeto MediaRecorder y comenzar la grabación
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.addEventListener('dataavailable', function(event) {
          chunks.push(event.data);
        });
        mediaRecorder.addEventListener('stop', function() {
          // Crear un objeto Blob con los datos grabados
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          
          // Enviar el audio al webservice
          transcribeAudio(audioBlob);
        });
        mediaRecorder.start();
    })
    .catch(function(error) {
      console.error(error);
    });
}

function stopAndCleanRecord() {
    // Detener la grabación
    mediaRecorder.stop();

    // Limpiar el objeto MediaRecorder y los datos grabados
    mediaRecorder = null;
    chunks = [];
}

/* INSTRUCTIONS */

const instructions = [
  'buscar producto a comprar',
  'abrir menú lateral',
  'ver mis últimas compras'
]

function instructionsToText() {
  return instructions.map((inst, i) => `${i+1}) ${inst}`).join(', ');
}

function getInitialMessages(text) {
  return [
    {
      role: 'system',
      content: 'Eres un selector de instrucciones que ayuda a usuarios ' +
      'de un importante portal de ventas a seleccionar la instrucción ' +
      'adecuada a partir de un texto.'
    },
    {
      role: 'assistant',
      content: `Hola, soy el selector de instrucciones. Las instrucciones posibles son: ${instructionsToText()}. ` +
      'A partir del texto que me escribas, te diré si se relaciona con una de las instrucciones. ' +
      "Si y solo si infiero que se refiere una de ellas, te responderé únicamente con el formato: 'instrucción: {numero}, '" +
      "donde número es la instrucción seleccionada, por ejemplo: 'instrucción 2'. " +
      "En caso contrario responderé única y exclusivamente con la palabra 'false'. " +
      'Jamás responderé de otra manera que no sea uno de estos dos formatos. ' + 
      'Escríbeme el texto a procesar.'
    },
    {
      role: 'user',
      content: text
    }
  ]
}

/* OPEN IA INTEGRATION*/

const OPENAI_API_KEY = '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'

// enviar archivo de audio a whisper para transcribirlo.
function transcribeAudio(audioBlob) {
  changeStatusToRecordButton('waiting');
  const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

  const headers = new Headers();
  headers.append('Authorization', 'Bearer ' + OPENAI_API_KEY);
  // Este header debiera ir segeun la docu, pero por alguna razón si lo agrego no funciona
  // myHeaders.append('Content-Type', 'multipart/form-data');

  const body = new FormData();
  body.append('model', 'whisper-1');
  body.append('file', audioBlob, 'audio.webm');
  body.append('language', 'es');

  fetch('https://api.openai.com/v1/audio/transcriptions', {method: 'POST', headers, body})
    .then(response => response.json())
    .then(data => inferInstruction(data.text))
    .catch(error => {
      changeStatusToRecordButton('enabled');
      console.log({error})
    });
}

function completeChat(messages) {
  const headers = new Headers();
  headers.append('Authorization', 'Bearer ' + OPENAI_API_KEY);
  headers.append("Content-Type", "application/json");

  const body = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7
  });

  return fetch('https://api.openai.com/v1/chat/completions', {method: 'POST', headers, body})
    .then(response => response.json())
    .catch(error => {
      changeStatusToRecordButton('enabled');
      console.log({error})
    });
}

function inferInstruction(text) {
  const messages = getInitialMessages(text);
  completeChat(messages)
    .then(data => {
      console.log({data});
      processInstruction(text, messages, data?.choices?.[0]?.message);
    });
}

function processInstruction(text, messages, newMessage) {
  console.log({newMessage});
  if (newMessage?.content) {
    const input = {text, messages, newMessage};
    const actionNumber = getActionNumber(newMessage.content);
    executeAction(actionNumber, input);
  }
  changeStatusToRecordButton('enabled');
}

/* ACTIONS */

function getActionNumber(instruction) {
  // expresión regular para buscar el patrón
  const regex = /instrucción?:\s*(\d+)/i;

  // se busca el patrón en el string
  const match = instruction.toLowerCase().match(regex);

  // Si se encontró el patrón, devolver el número
  if (match && match[1]) {
    return parseInt(match[1]);
  }

  // Si no se encontró el patrón, devolver 0
  return 0;
}

const actions = [
  doNothing,
  searchProduct,
  openMenu,
  seeLastPurchases
]

function executeAction(actionNumber, input) {
  actions[actionNumber](input);
}

function doNothing(input) {
  console.log('nothing to do!');
}

function searchProduct(input) {
  const getSearchTextMessage = {
    role: 'user',
    content: `Ok, como la instrucción es la 1, a partir del texto que te envié a procesar: '${input.text}',` +
    "¿qué texto me recomiendas poner en la caja de búsqueda?, " +
    "respóndeme únicamente con el texto que me recomiendas. " +
    "No me respondas de otra manera ni añadas nada más que el texto recomendado"
  }

  const searchProductMessages = input.messages.concat(input.newMessage, getSearchTextMessage);
  console.log(searchProductMessages);
  completeChat(searchProductMessages)
    .then(data => {
      console.log({data});
      const searchText = data?.choices?.[0]?.message?.content?.replace(/['"]+/g, '');
      if (searchText) {
          const inputElement = document.getElementById('cb1-edit');
          inputElement.value = searchText;
          const formElement = document.querySelector('.nav-search');
          formElement.submit();
        } else {
          console.log('no se puedo extraer texto recomendado.');
        }
    });
}

function openMenu(input) {
  console.log('openMenu pending');
}

function seeLastPurchases(input) {
  console.log('seeLastPurchases pending');
}





