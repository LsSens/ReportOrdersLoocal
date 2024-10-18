const express = require("express");
const router = express.Router();
const sequelize = require("../database");

router.get("/report/:companyId/:period", async (req, res) => {
  try {
    const { period, companyId } = req.params;
    let dateFilter;

    switch (period) {
      case "day":
        dateFilter = new Date(new Date().setHours(0, 0, 0, 0));
        break;
      case "week":
        dateFilter = new Date(new Date().setDate(new Date().getDate() - 7));
        break;
      case "month":
        dateFilter = new Date(new Date().setDate(new Date().getDate() - 30));
        break;
      default:
        return res.status(400).json({ error: "Período inválido" });
    }

    const query = `
    SELECT 
      o.id AS order_id,
      o.order_status_id AS order_status_id,  
      c.name AS customer_name, 
      a.address, 
      o.loocal_fee AS loocal_fee,
      o.delivery_cost AS delivery_cost,
      o.distance as distance,
      dm.nickname AS deliveryman_name,
      rd.shipment_id AS rd_shipment_id,
      ifood.display_id AS ifood_display_id
    FROM 
      orders o
    JOIN 
      customers c ON o.customer_id = c.id
    JOIN 
      addresses a ON c.address_id = a.id
    LEFT JOIN 
      delivery_order do_ ON o.id = do_.order_id
    LEFT JOIN 
      deliveries d ON do_.delivery_id = d.id
    LEFT JOIN 
      deliverymans dm ON d.deliveryman_id = dm.id
    LEFT JOIN 
      rd_orders rd ON o.id = rd.order_id
    LEFT JOIN 
      ifood_orders ifood ON o.id = ifood.order_id
    WHERE 
      o.company_id = :companyId
    AND 
      o.created_at >= :dateFilter
    ORDER BY 
      o.created_at DESC;
  `;

    const orders = await sequelize.query(query, {
      replacements: { companyId, dateFilter },
      type: sequelize.QueryTypes.SELECT,
    });

    const statusMap = {
      1: "Aguardando",
      2: "Preparando",
      3: "Pronto",
      4: "A caminho",
      5: "Entregue",
      6: "Cancelado",
      7: "A caminho da retirada"
    };

    const report = orders.map((order) => {
      const localFee = parseFloat(order.local_fee) || 0;
      const deliveryCost = parseFloat(order.delivery_cost) || 0;
  
      const distance = String(order.distance ?? 0).padStart(4, '0');
      const distanceInt = parseInt(distance, 10);
      const formattedDistance = distanceInt < 1000
          ? `${new Intl.NumberFormat('pt-BR').format(distanceInt)} metros`
          : `${(distanceInt / 1000).toFixed(1).replace('.', ',')} KM`;

      return {
        "Origem": order.ifood_display_id ? `Ifood: (${order.ifood_display_id})` : order.rd_shipment_id ? `Raia: (${order.rd_shipment_id})` : 'Loocal',
        "Loocal ID": order.order_id,
        "Nome do Cliente": order.customer_name,
        "Endereço": order.address,
        "Distancia": formattedDistance,
        "Taxa da Entrega": `R$ ${(localFee + deliveryCost)
          .toFixed(2)
          .replace(".", ",")}`,
        "Status": statusMap[order.order_status_id] || "Desconhecido",
        "Nome do Entregador": order.deliveryman_name || "N/A"
      };
    });

    res.status(200).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar o relatório" });
  }
});

module.exports = router;
