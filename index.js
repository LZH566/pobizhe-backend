const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// CORS 配置
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors());

app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 健康检查
app.get("/", (req, res) => {
  res.json({ message: "破壁者后端API运行中", status: "ok" });
});

// 提交商家入驻申请
app.post("/api/merchant/apply", async (req, res) => {
  try {
    const data = req.body;

    const { error } = await supabase.from("merchant_applications").insert([
      {
        apply_date: data.applyDate,
        entity_type: data.entityType,
        name: data.name,
        id_card: data.idCard,
        phone: data.phone,
        bank_card: data.bankCard,
        bank_name: data.bankName,
        settlement_period: data.settlementPeriod,
        shop_name: data.shopName,
        category: data.category,
        origin: data.origin,
        corporate_account: data.corporateAccount,
        certifications: JSON.stringify(data.certifications),
        pains: JSON.stringify(data.pains),
        services: JSON.stringify(data.services),
        tools: JSON.stringify(data.tools),
        web_manage: data.webManage,
        needs: JSON.stringify(data.needs),
        need_presale: data.needPresale,
        need_group: data.needGroup,
        inventory_frequency: data.inventoryFrequency,
        shipping_type: data.shippingType,
        ship_areas: JSON.stringify(data.shipAreas),
        need_cold_chain: data.needColdChain,
        sale_units: JSON.stringify(data.saleUnits),
        products: JSON.stringify(data.products),
        status: "pending",
      },
    ]);

    if (error) throw error;
    res.json({ success: true, message: "申请已提交" });
  } catch (error) {
    console.error("提交失败:", error);
    res.json({ success: false, message: error.message });
  }
});

// 获取所有申请
app.get("/api/merchant/applications", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("merchant_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 审核申请
app.post("/api/merchant/review/:id", async (req, res) => {
  try {
    const { status, reviewRemark } = req.body;

    const { error } = await supabase
      .from("merchant_applications")
      .update({
        status: status,
        review_remark: reviewRemark,
        reviewed_at: new Date(),
      })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true, message: "审核完成" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 统计数据
app.get("/api/merchant/statistics", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("merchant_applications")
      .select("status");

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: data?.filter((d) => d.status === "pending").length || 0,
      approved: data?.filter((d) => d.status === "approved").length || 0,
      rejected: data?.filter((d) => d.status === "rejected").length || 0,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
