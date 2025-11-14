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

window.document.addEventListener("DOMContentLoaded", async () => {
  const main = document.querySelector("main");
  const regiaoSelect = main.querySelector("#regiao");
  const cidadeSelect = main.querySelector("#municipio");
  const form = main.querySelector("form");
  for (const estado in DATA) {
    const option = document.createElement("option");
    option.setAttribute("value", estado);
    option.textContent = estado;
    regiaoSelect.appendChild(option);
  }

  regiaoSelect.addEventListener("change", () => {
    cidadeSelect.innerHTML = '<option value="">Selecione a cidade</option>';
    const cidades = DATA[regiaoSelect.value];
    if (!cidades) return;

    for (const cidade in cidades) {
      const option = document.createElement("option");
      option.value = cidade;
      option.textContent = cidade;
      cidadeSelect.appendChild(option);
    }
  });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const estado = regiaoSelect.value;
    const cidade = cidadeSelect.value;
    const chavePix = DATA[estado][cidade].chave;
    const pix = new PixPayloadGenerator(
      chavePix, // Chave
      "Central Cidadania", // Nome
      cidade, // Cidade
      {
        amount: 20, // Valor padrão
        txid: "Doação Central da Cidadania", // Descrição
      }, // Opções
    );
    const pixResultado = pix.generate();
  });
});
