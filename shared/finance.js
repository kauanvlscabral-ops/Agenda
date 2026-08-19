/**
 * Regra financeira central da reserva.
 * Usado tanto no navegador (script.js) quanto no servidor (routes/reservas.js)
 * para garantir que tela e banco de dados NUNCA divirjam.
 *
 * Status possíveis:
 *  - 'pendente'  -> Sinal pendente   (nada recebido ainda)
 *  - 'recebido'  -> Sinal recebido   (só o sinal foi recebido)
 *  - 'pago'      -> Pago             (valor total quitado)
 *  - 'nao_pago'  -> Não pago         (nada recebido, marcado explicitamente)
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MareFinance = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const STATUS_LIST = ['pendente', 'recebido', 'pago', 'nao_pago'];

  const STATUS_LABELS = {
    pendente: 'Sinal pendente',
    recebido: 'Sinal recebido',
    pago: 'Pago',
    nao_pago: 'Não pago',
  };

  // Classe CSS (badge) para cada status
  const STATUS_CSS = {
    pendente: 'pendente',
    recebido: 'recebido',
    pago: 'pago',
    nao_pago: 'naopago',
  };

  function isValidStatus(status) {
    return STATUS_LIST.indexOf(status) !== -1;
  }

  /**
   * Calcula valorRecebido / totalAReceber (== saldoRestante) a partir do status.
   * O valor original do aluguel NUNCA é alterado por esta função.
   */
  function computeFinance(status, valorAluguel, valorSinal) {
    const aluguel = Number(valorAluguel) || 0;
    const sinal = Number(valorSinal) || 0;
    let valorRecebido = 0;
    let totalAReceber = 0;

    switch (status) {
      case 'pago':
        valorRecebido = aluguel;
        totalAReceber = 0;
        break;
      case 'recebido':
        valorRecebido = sinal;
        totalAReceber = aluguel - sinal;
        break;
      case 'nao_pago':
        valorRecebido = 0;
        totalAReceber = aluguel;
        break;
      case 'pendente':
      default:
        valorRecebido = 0;
        totalAReceber = aluguel;
        break;
    }

    if (totalAReceber < 0) totalAReceber = 0;

    return {
      valorRecebido: round2(valorRecebido),
      totalAReceber: round2(totalAReceber),
      saldoRestante: round2(totalAReceber),
    };
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  return { STATUS_LIST, STATUS_LABELS, STATUS_CSS, isValidStatus, computeFinance };
});
