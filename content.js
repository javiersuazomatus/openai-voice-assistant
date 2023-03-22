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

async function handleRecord() {
  // Si no se está grabando, comenzar la grabación
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    changeRecordButtonStatus('recording')
        .then(()=>{
            return createRecording();
        })
        .then((audioBlob)=>{

        })
        .then((response)=>{
          console.log(response)
        });

  } else {
    await stopAndCleanRecord().then(() => {
      changeRecordButtonStatus('enabled');
    });
  }
}

async function changeRecordButtonStatus(status) {
  const change = {
    enabled: function() {
      console.log("enabling mic");
      recordButton.style.backgroundImage = `url(${chrome.runtime.getURL('./micro-48.png')})`;
      recordButton.disabled = false;
    },
    recording: function() {
      console.log("mic is recording");
      recordButton.style.backgroundImage = `url(${chrome.runtime.getURL('./micro-red-48.png')})`;
      recordButton.disabled = false;
    },
    waiting: function() {
      console.log("mic is waiting");
      recordButton.style.backgroundImage = `url(${chrome.runtime.getURL('./micro-await-48.png')})`;
      recordButton.disabled = true;
    }
  }
  change[status]();

}

function createRecording() {
  // Solicitar acceso al micrófono
  return navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
      // Crear un objeto MediaRecorder y comenzar la grabación
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.addEventListener('dataavailable', function(event) {
          chunks.push(event.data);
        });
        mediaRecorder.addEventListener('stop', function() {
          // Crear un objeto Blob con los datos grabados
          //return new Blob(chunks, { type: 'audio/webm' });
          return new Promise((resolve) => {
            console.log("resolved", chunks);
            resolve(new Blob(chunks, { type: 'audio/webm' }));
          })
          .then(audioBlob => {
            console.log(audioBlob);
            transcribeAudio(audioBlob)
          });
        });
        mediaRecorder.start();
    })
    .catch(function(error) {
      console.error(error);
    });
}



async function stopAndCleanRecord() {
    // Detener la grabación
  console.log("stopping recording");
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