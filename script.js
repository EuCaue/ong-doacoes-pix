/**
 * Classe para gerar payloads de QR Code PIX (BR Code).
 */
class PixPayloadGenerator {
  /**
   * @param {string} key - A chave PIX (CPF/CNPJ, e-mail, celular no formato +55DDDXXXXXXXXX, ou chave aleatória).
   * @param {string} merchantName - O nome do beneficiário.
   * @param {string} merchantCity - A cidade do beneficiário.
   * @param {object} [options] - Opções da transação (opcional).
   * @param {number} [options.amount] - O valor da transação (opcional).
   * @param {string} [options.txid] - Um identificador da transação (opcional).
   */
  constructor(key, merchantName, merchantCity, options = {}) {
    this.key = key;
    this.merchantName = merchantName;
    this.merchantCity = merchantCity;
    this.amount = options.amount;
    this.txid = options.txid;
  }

  /**
   * Formata um campo do BR Code (ID + Tamanho + Valor).
   */
  #formatField(id, value) {
    const size = ("00" + value.length).slice(-2);
    return `${id}${size}${value}`;
  }

  /**
   * Normaliza o texto: remove acentos, converte para maiúsculas e remove caracteres especiais.
   */
  #normalizeText(text) {
    if (!text) return "";
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "");
  }

  /**
   * Calcula o CRC16 (Cyclic Redundancy Check) para o payload do PIX.
   */
  #crc16(payload) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }
    return ("0000" + (crc & 0xffff).toString(16).toUpperCase()).slice(-4);
  }

  /**
   * Gera a string completa do "PIX Copia e Cola" (BR Code)
   * usando os dados fornecidos no construtor.
   * @returns {string} - A string completa do BR Code.
   */
  generate() {
    // Normaliza e trunca os campos de texto estáticos
    const safeMerchantName = this.#normalizeText(this.merchantName).substring(
      0,
      25,
    );
    const safeMerchantCity = this.#normalizeText(this.merchantCity).substring(
      0,
      15,
    );

    // Define o TXID. Para PIX estático, '***' é obrigatório se um ID não for fornecido.
    const finalTxid = this.#normalizeText(
      (this.txid || "***").substring(0, 25),
    ).replaceAll(" ", "");

    // Montagem do Payload
    let payload = this.#formatField("00", "01"); // Payload Format Indicator

    // Merchant Account Information (ID 26)
    let merchantAccountInfo = this.#formatField("00", "br.gov.bcb.pix"); // GUI
    merchantAccountInfo += this.#formatField("01", this.key); // Chave PIX
    payload += this.#formatField("26", merchantAccountInfo);

    payload += this.#formatField("52", "0000"); // Merchant Category Code
    payload += this.#formatField("53", "986"); // Transaction Currency (BRL)

    // Valor da Transação (ID 54) - Opcional
    // Lê o valor que foi salvo no 'this' pelo construtor
    if (this.amount && this.amount > 0) {
      const formattedAmount = this.amount.toFixed(2).toString();
      payload += this.#formatField("54", formattedAmount);
    }

    // Informações do País e do Beneficiário
    payload += this.#formatField("58", "BR"); // Country Code
    payload += this.#formatField("59", safeMerchantName); // Merchant Name (Normalizado)
    payload += this.#formatField("60", safeMerchantCity); // Merchant City (Normalizado)

    // Additional Data Field Template (ID 62) ---
    // Lê o txid que foi salvo no 'this' pelo construtor
    const additionalData = this.#formatField("05", finalTxid);
    payload += this.#formatField("62", additionalData);

    // Adiciona o campo do CRC16 (ID 63) ---
    payload += "6304";

    // Calcula o CRC16 sobre o payload construído
    const crc = this.#crc16(payload);

    // Retorna o payload completo com o CRC
    return payload + crc;
  }
}

/**
 * Dados das chaves Pix por estado e cidade.
 * Cada chave de estado contém um objeto de cidades,
 * onde cada cidade possui uma propriedade `chave` com o número Pix.
 *
 * @type {{ [estado: string]: { [cidade: string]: { chave: string } } }}
 */
const DATA = {
  BA: {
    Salvador: {
      chave: "+5571997170057",
    },
    Camaçari: {
      chave: "+5571997170057",
    },
    "Feira de Santana": {
      chave: "+5575988270192",
    },
    "Central/Sertão": {
      chave: "+5574999716726",
    },
  },
  RJ: {
    "Rio De Janeiro": {
      chave: "+5521987620120",
    },
  },
};
/**
 * @param {any} obj -
 * @returns {obj} -
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  Object.keys(obj).forEach((key) => {
    deepFreeze(obj[key]);
  });

  return Object.freeze(obj);
}

deepFreeze(DATA);

function loadCities(selectElement, region) {
  selectElement.innerHTML = '<option value="">Selecione a cidade</option>';
  const cidades = DATA[region];
  if (!cidades) return;

  for (const cidade in cidades) {
    const option = document.createElement("option");
    option.value = cidade;
    option.textContent = cidade;
    selectElement.appendChild(option);
  }
}

function loadRegion(selectElement) {
  for (const estado in DATA) {
    const option = document.createElement("option");
    option.setAttribute("value", estado);
    option.textContent = estado;
    selectElement.appendChild(option);
  }
}

function createPixQrCode(key, city, options) {
  const pix = new PixPayloadGenerator(
    key, // Chave
    "Central Cidadania", // Nome
    city, // Cidade
    options,
  );
  const pixResultado = pix.generate();

  let qrSvgString = qr.encodeQR(pixResultado, "svg");
  qrSvgString = qrSvgString.replace(
    /^<svg /,
    '<svg id="qr-svg" preserveAspectRatio="xMidYMid meet" ',
  );
  const qrCodeElement = document.getElementById("qr-code");
  qrCodeElement.innerHTML = qrSvgString;
  qrCodeElement.innerHTML += `
<code id="pix-copia" title="Clique para copiar a chave copia e cola">
    ${pixResultado}
</code>
`;
  qrCodeElement
    .querySelector("#pix-copia")
    .addEventListener("click", async () => {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(pixResultado);
        window.alert("Chave copiada para a área de transferência.");
      }
    });
}

/** Deletes the QRCODE Element */
function deleteQrCode() {
  const qrCodeElement = document.getElementById("qr-code");
  qrCodeElement.replaceChildren();
}

/**
 * @param {string} s -
 * @returns {string} - string only contain numbers
 */
function stringToOnlyNumbers(s) {
  return String(s).replace(/[^0-9.,-]+/g, "");
}

/**
 * @param {string} value - input to parse
 * @returns {string} - parsed value
 */
function parseValor(value) {
  let parsedValue = stringToOnlyNumbers(value);
  const shouldReplace = parsedValue.split(".").length > 1;
  if (shouldReplace) {
    parsedValue = parsedValue.replaceAll(".", "").replaceAll(",", ".");
  } else {
    parsedValue = parsedValue.replaceAll(",", ".");
  }
  return parsedValue;
}

window.document.addEventListener("DOMContentLoaded", async () => {
  const main = document.querySelector("main");
  const regiaoSelect = main.querySelector("#regiao");
  const cidadeSelect = main.querySelector("#municipio");
  const valorInput = main.querySelector("#valor");
  const form = main.querySelector("form");
  const btnGerarPix = main.querySelector("form button[type='submit']");
  btnGerarPix.disabled = true;
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    maximumFractionDigits: 2,
    currencyDisplay: "symbol",
    currency: "BRL",
  });
  loadRegion(regiaoSelect);
  loadCities(cidadeSelect, regiaoSelect.value);
  regiaoSelect.addEventListener("change", () => {
    deleteQrCode();
    loadCities(cidadeSelect, regiaoSelect.value);
    btnGerarPix.disabled = true;
  });
  cidadeSelect.addEventListener("change", () => {
    btnGerarPix.disabled = false;
  });
  valorInput.addEventListener("focus", (ev) => {
    const value = ev.currentTarget.value;
    ev.target.value = value.length > 1 ? stringToOnlyNumbers(value) : "";
  });
  valorInput.addEventListener("blur", (ev) => {
    const value = parseValor(ev.currentTarget.value);
    if (value.length < 1) {
      ev.currentTarget.value = "";
      return;
    }
    ev.currentTarget.value = formatter.format(value);
  });
  valorInput.addEventListener("keydown", (ev) => {
    if (
      ev.key === "Backspace" ||
      ev.key === "ArrowLeft" ||
      ev.key === "ArrowRight" ||
      ev.key === "Delete"
    ) {
      return;
    }
    if (!/\d/.test(ev.key)) {
      ev.preventDefault();
    }
  });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const estado = regiaoSelect.value;
    const cidade = cidadeSelect.value;
    const chavePix = DATA[estado][cidade].chave;
    const valor = parseValor(valorInput.value);
    const opcoes = {
      amount: Number(valor), // Valor padrão
      txid: "Doação Central de Cidadania", // Descrição
    };
    createPixQrCode(chavePix, cidade, opcoes);
  });
});
