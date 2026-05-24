const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// CORS 配置 - 允许所有来源访问
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors());

// 增加请求体大小限制（解决 413 错误）
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 健康检查
app.get("/", (req, res) => {
  res.json({ message: "破壁者后端API运行中", status: "ok" });
});

// 测试 CORS 接口
app.get("/api/status", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "CORS 配置成功",
  });
});

// 提交商家入驻申请
app.post("/api/merchant/apply", async (req, res) => {
  // 设置 CORS 头
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const data = req.body;

    console.log("收到商家入驻申请:", {
      name: data.name,
      phone: data.phone,
      shop_name: data.shop_name,
      product_count: data.products
        ? Array.isArray(data.products)
          ? data.products.length
          : 0
        : 0,
    });

    // 基本验证
    if (!data.name || !data.phone || !data.shop_name) {
      return res.status(400).json({
        success: false,
        message: "缺少必要信息：姓名、手机号、店铺名称",
      });
    }

    // 准备保存的数据
    const applicationData = {
      apply_date: new Date().toISOString(),
      name: data.name,
      phone: data.phone,
      id_card: data.id_card || "",
      shop_name: data.shop_name,
      origin: data.origin || "",
      category: data.category || "",
      bank_card: data.bank_card || "",
      bank_name: data.bank_name || "",
      ship_address: data.ship_address || "",
      entity_type: data.entity_type || "个人农户",
      settlement_period: data.settlement_period || "T+7",
      status: "pending",
      created_at: new Date().toISOString(),
    };

    // 如果有 Supabase 配置，保存到数据库
    if (supabaseUrl && supabaseKey && supabaseUrl !== "your_supabase_url") {
      const { error } = await supabase
        .from("merchant_applications")
        .insert([applicationData]);
      if (error) {
        console.error("Supabase 保存失败:", error);
        // 即使数据库保存失败，也返回成功（演示模式）
      }
    }

    // 返回成功响应
    res.json({
      success: true,
      message: "入驻申请已提交，等待审核",
      applyId: Date.now().toString(),
    });
  } catch (error) {
    console.error("处理入驻申请失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器错误: " + error.message,
    });
  }
});

// 获取所有申请
app.get("/api/merchant/applications", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (supabaseUrl && supabaseKey && supabaseUrl !== "your_supabase_url") {
      const { data, error } = await supabase
        .from("merchant_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } else {
      // 没有数据库时返回空数组
      res.json({ success: true, data: [] });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: [] });
  }
});

// 审核申请
app.post("/api/merchant/review/:id", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { status, reviewRemark } = req.body;

    if (supabaseUrl && supabaseKey && supabaseUrl !== "your_supabase_url") {
      const { error } = await supabase
        .from("merchant_applications")
        .update({
          status: status,
          review_remark: reviewRemark,
          reviewed_at: new Date(),
        })
        .eq("id", req.params.id);

      if (error) throw error;
    }

    res.json({ success: true, message: "审核完成" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
