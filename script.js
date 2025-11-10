//  TODO: scroll to the center
//  TODO: generate qr code pix 

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
      chave: "+5571999999999",
    },
    Camaçari: {
      chave: "+5571999999999",
    },
    "Feira de Santana": {
      chave: "+5575999999999",
    },
    "Central/Sertão": {
      chave: "+5574999999999",
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
    console.log("CIDADES", cidades);
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
    console.log(regiaoSelect.value, cidadeSelect.value);
    const estado = regiaoSelect.value;
    const cidade = cidadeSelect.value;
    console.log(DATA[estado][cidade].chave);
  });
});
