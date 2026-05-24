const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS 配置
app.use(
  cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }),
);
app.options("*", cors());

// 增加请求体大小限制
app.use(express.json({ limit: "50mb" }));

// ========== 内存存储（不用数据库） ==========
let merchantApplications = [];
let nextId = 1;

// 健康检查
app.get("/", (req, res) => {
  res.json({ message: "破壁者后端API运行中", status: "ok" });
});

// 测试接口
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ========== 提交商家入驻申请 ==========
app.post("/api/merchant/apply", (req, res) => {
  console.log("收到入驻申请:", req.body.name);

  try {
    const data = req.body;

    // 验证必填字段
    if (!data.name || !data.phone || !data.shop_name) {
      return res.status(400).json({
        success: false,
        message: "缺少必要信息：姓名、手机号、店铺名称",
      });
    }

    // 保存到内存
    const newApp = {
      id: nextId++,
      name: data.name,
      phone: data.phone,
      id_card: data.id_card || "",
      shop_name: data.shop_name,
      origin: data.origin || "",
      category: data.category || "",
      bank_card: data.bank_card || "",
      bank_name: data.bank_name || "",
      entity_type: data.entity_type || "个人农户",
      settlement_period: data.settlement_period || "T+7",
      products: data.products || "[]",
      status: "pending",
      created_at: new Date().toISOString(),
      review_remark: "",
    };

    merchantApplications.unshift(newApp);
    console.log("当前申请总数:", merchantApplications.length);

    res.json({
      success: true,
      message: "入驻申请已提交，等待审核",
      applyId: newApp.id,
    });
  } catch (error) {
    console.error("提交失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 获取所有申请 ==========
app.get("/api/merchant/applications", (req, res) => {
  const { status } = req.query;
  let result = [...merchantApplications];

  if (status && status !== "all") {
    result = result.filter((app) => app.status === status);
  }

  res.json({ success: true, data: result });
});

// ========== 审核申请 ==========
app.post("/api/merchant/review/:id", (req, res) => {
  try {
    const { status, reviewRemark } = req.body;
    const id = parseInt(req.params.id);

    const app = merchantApplications.find((a) => a.id === id);
    if (!app) {
      return res.status(404).json({ success: false, message: "申请不存在" });
    }

    app.status = status;
    app.review_remark = reviewRemark || "";
    app.reviewed_at = new Date().toISOString();

    res.json({
      success: true,
      message: status === "approved" ? "已通过" : "已拒绝",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 统计数据 ==========
app.get("/api/merchant/statistics", (req, res) => {
  const total = merchantApplications.length;
  const pending = merchantApplications.filter(
    (a) => a.status === "pending",
  ).length;
  const approved = merchantApplications.filter(
    (a) => a.status === "approved",
  ).length;
  const rejected = merchantApplications.filter(
    (a) => a.status === "rejected",
  ).length;

  res.json({ success: true, data: { total, pending, approved, rejected } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`内存中已有 ${merchantApplications.length} 条申请`);
});
