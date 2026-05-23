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

app.use(express.json({ limit: "50mb" })); // 支持大图片上传

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 健康检查
app.get("/", (req, res) => {
  res.json({ message: "破壁者后端API运行中", status: "ok" });
});

// 提交商家入驻申请 - 修正字段名映射
app.post("/api/merchant/apply", async (req, res) => {
  try {
    const data = req.body;
    console.log("收到入驻申请:", data.name);

    // 映射前端字段到数据库字段
    const insertData = {
      apply_date: data.apply_date || new Date().toISOString(),
      entity_type: data.entity_type,
      name: data.name,
      id_card: data.id_card,
      phone: data.phone,
      bank_card: data.bank_card || "",
      bank_name: data.bank_name || "",
      settlement_period: data.settlement_period,
      shop_name: data.shop_name,
      category: data.category,
      origin: data.origin,
      ship_address: data.ship_address,
      corporate_account: data.corporate_account,
      certifications: data.certifications
        ? JSON.stringify(data.certifications)
        : null,
      pains: data.pains ? JSON.stringify(data.pains) : null,
      services: data.services ? JSON.stringify(data.services) : null,
      tools: data.tools ? JSON.stringify(data.tools) : null,
      web_manage: data.web_manage,
      needs: data.needs ? JSON.stringify(data.needs) : null,
      need_presale: data.need_presale || false,
      need_group: data.need_group || false,
      inventory_frequency: data.inventory_frequency,
      shipping_type: data.shipping_type,
      ship_areas: data.ship_areas ? JSON.stringify(data.ship_areas) : null,
      need_cold_chain: data.need_cold_chain,
      sale_units: data.sale_units ? JSON.stringify(data.sale_units) : null,
      products: data.products ? JSON.stringify(data.products) : null,
      id_card_front: data.id_card_front || "",
      id_card_back: data.id_card_back || "",
      origin_proof: data.origin_proof || "",
      avatar: data.avatar || "",
      password: data.password,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("merchant_applications")
      .insert([insertData]);

    if (error) {
      console.error("Supabase错误:", error);
      throw error;
    }

    res.json({ success: true, message: "申请已提交" });
  } catch (error) {
    console.error("提交失败:", error);
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个申请详情
app.get("/api/merchant/applications/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("merchant_applications")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true, message: "审核完成" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// 用户相关 API
app.get("/api/users", async (req, res) => {
  try {
    // 从本地存储或另一个表获取用户数据
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
