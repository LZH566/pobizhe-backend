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

// ========== Supabase 配置 ==========
const { createClient } = require("@supabase/supabase-js");

// 使用您现有的 Supabase 配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://snqlzwwtlkmeflvhezfk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;  // 从环境变量读取
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== 健康检查 ==========
app.get("/", (req, res) => {
  res.json({ message: "破壁者后端API运行中", status: "ok" });
});

app.get("/api/status", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ========== 订单管理 API（使用 Supabase）==========

// 获取所有订单
app.get("/api/orders", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("获取订单失败:", error);
    res.json({ success: true, data: [] });
  }
});

// 创建新订单
app.post("/api/orders", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const order = req.body;

    if (!order.id || !order.userId) {
      return res.status(400).json({
        success: false,
        message: "订单信息不完整：缺少订单ID或用户ID",
      });
    }

    // 插入到 Supabase
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          id: order.id,
          user_id: order.userId,
          user_name: order.userName,
          user_phone: order.userPhone,
          user_type: order.userType || "customer",
          total_amount: order.subtotal,
          shipping_fee: order.shippingFee || 0,
          final_amount: order.total,
          status: order.status || "pending",
          payment_method: order.paymentMethod || "wechat",
          receiver_name: order.receiver,
          receiver_phone: order.phone,
          receiver_address: order.address,
          items: JSON.stringify(order.items),
          created_at: order.createdAt || new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    console.log(`✅ 订单已保存到 Supabase: ${order.id}`);
    res.json({ success: true, message: "订单创建成功", orderId: order.id });
  } catch (error) {
    console.error("创建订单失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新订单状态
app.put("/api/orders/:id/status", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const { error } = await supabase
      .from("orders")
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) throw error;

    console.log(`📦 订单状态更新: ${orderId} -> ${status}`);
    res.json({ success: true, message: "订单状态已更新" });
  } catch (error) {
    console.error("更新订单状态失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除订单
app.delete("/api/orders/:id", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const orderId = req.params.id;

    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) throw error;

    console.log(`🗑️ 订单已删除: ${orderId}`);
    res.json({ success: true, message: "订单已删除" });
  } catch (error) {
    console.error("删除订单失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 商家入驻申请 API（使用 Supabase）==========

// 提交商家入驻申请
app.post("/api/merchant/apply", async (req, res) => {
  console.log("收到入驻申请:", req.body.name);
  try {
    const data = req.body;

    if (!data.name || !data.phone || !data.shop_name) {
      return res.status(400).json({
        success: false,
        message: "缺少必要信息：姓名、手机号、店铺名称",
      });
    }

    // 插入到 Supabase
    const { error } = await supabase.from("merchant_applications").insert([
      {
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
      },
    ]);

    if (error) throw error;

    console.log("入驻申请已提交到 Supabase");
    res.json({
      success: true,
      message: "入驻申请已提交，等待审核",
    });
  } catch (error) {
    console.error("提交失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取所有申请
app.get("/api/merchant/applications", async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from("merchant_applications").select("*");

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("获取申请失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审核申请
app.post("/api/merchant/review/:id", async (req, res) => {
  try {
    const { status, reviewRemark } = req.body;
    const id = parseInt(req.params.id);

    const { error } = await supabase
      .from("merchant_applications")
      .update({
        status: status,
        review_remark: reviewRemark || "",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
      message: status === "approved" ? "已通过" : "已拒绝",
    });
  } catch (error) {
    console.error("审核失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取申请统计
app.get("/api/merchant/statistics", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("merchant_applications")
      .select("status");

    if (error) throw error;

    const total = data.length;
    const pending = data.filter((a) => a.status === "pending").length;
    const approved = data.filter((a) => a.status === "approved").length;
    const rejected = data.filter((a) => a.status === "rejected").length;

    res.json({ success: true, data: { total, pending, approved, rejected } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 商品管理 API（使用 Supabase）==========

// 获取所有商品
app.get("/api/products", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, products: data || [] });
  } catch (error) {
    console.error("获取商品失败:", error);
    res.json({ success: true, products: [] });
  }
});

// 同步商品数据
app.post("/api/products/sync", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { products } = req.body;
    if (products && Array.isArray(products)) {
      // 先清空再插入
      await supabase.from("products").delete().neq("id", 0);

      for (const product of products) {
        await supabase.from("products").insert([
          {
            id: product.id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            image: product.image,
            seller: product.seller,
            badge: product.badge,
            address: product.address,
            description: product.description,
            is_certified: product.isCertified || false,
            trace_code: product.traceCode,
            sales_count: product.salesCount || 0,
            good_rate: product.goodRate || 100,
            review_count: product.reviewCount || 0,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      console.log(`商品同步成功，共 ${products.length} 个商品`);
      res.json({ success: true, message: "商品数据已同步" });
    } else {
      res.status(400).json({ success: false, message: "无效的商品数据" });
    }
  } catch (error) {
    console.error("同步商品失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== 用户管理 API ==========

// 获取所有用户（从 Supabase）
app.get("/api/users", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("获取用户失败:", error);
    res.json({ success: true, data: [] });
  }
});

// 删除用户
app.delete("/api/users/:userId", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const userId = req.params.userId;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ success: true, message: "用户已删除" });
  } catch (error) {
    console.error("删除用户失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
