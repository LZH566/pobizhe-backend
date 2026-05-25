const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// CORS 配置
app.use(
  cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }),
);
app.options("*", cors());
app.use(express.json({ limit: "50mb" }));

// Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== 健康检查 ====================
app.get("/", (req, res) => {
  res.json({ message: "破壁者后端API运行中", status: "ok" });
});

app.get("/api/status", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==================== 用户管理 API ====================

// 获取所有用户
app.get("/api/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.json({ success: false, message: error.message, data: [] });
  }
});

// 获取单个用户
app.get("/api/users/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", req.params.id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 注册用户
app.post("/api/users/register", async (req, res) => {
  try {
    const userData = req.body;

    // 检查手机号是否已存在
    const { data: existing } = await supabase
      .from("users")
      .select("phone")
      .eq("phone", userData.phone);
    if (existing && existing.length > 0) {
      return res.json({ success: false, message: "手机号已注册" });
    }

    const { data, error } = await supabase
      .from("users")
      .insert([userData])
      .select();
    if (error) throw error;

    res.json({ success: true, data: data[0], message: "注册成功" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 登录
app.post("/api/users/login", async (req, res) => {
  try {
    const { account, password } = req.body;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("account", account)
      .eq("password", password);
    if (error) throw error;

    if (data && data.length > 0) {
      res.json({ success: true, data: data[0], message: "登录成功" });
    } else {
      res.json({ success: false, message: "账号或密码错误" });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 更新用户信息
app.put("/api/users/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .update(req.body)
      .eq("user_id", req.params.id)
      .select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: "更新成功" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 删除用户
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", req.params.id);
    if (error) throw error;
    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ==================== 商家入驻申请 API ====================

// 提交申请
app.post("/api/merchant/apply", async (req, res) => {
  try {
    const data = req.body;

    // 检查手机号是否已有申请
    const { data: existing } = await supabase
      .from("merchant_applications")
      .select("phone")
      .eq("phone", data.phone)
      .eq("status", "pending");
    if (existing && existing.length > 0) {
      return res.json({ success: false, message: "已有待审核的申请" });
    }

    const { error } = await supabase.from("merchant_applications").insert([
      {
        name: data.name,
        phone: data.phone,
        id_card: data.id_card,
        shop_name: data.shop_name,
        origin: data.origin,
        category: data.category,
        bank_card: data.bank_card,
        bank_name: data.bank_name,
        ship_address: data.ship_address,
        entity_type: data.entity_type,
        settlement_period: data.settlement_period,
        tools: data.tools,
        web_manage: data.web_manage,
        needs: data.needs,
        sale_units: data.sale_units,
        ship_areas: data.ship_areas,
        need_cold_chain: data.need_cold_chain,
        pains: data.pains,
        services: data.services,
        need_presale: data.need_presale,
        need_group: data.need_group,
        inventory_frequency: data.inventory_frequency,
        shipping_type: data.shipping_type,
        products: data.products,
        avatar: data.avatar,
        status: "pending",
      },
    ]);

    if (error) throw error;
    res.json({ success: true, message: "申请已提交" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 获取所有申请
app.get("/api/merchant/applications", async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from("merchant_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.json({ success: false, message: error.message, data: [] });
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
    res.json({
      success: true,
      message: status === "approved" ? "已通过" : "已拒绝",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ==================== 商品管理 API ====================

// 获取所有商品
app.get("/api/products", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, products: data || [] });
  } catch (error) {
    res.json({ success: false, products: [], message: error.message });
  }
});

// 同步商品（批量）
app.post("/api/products/sync", async (req, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res
        .status(400)
        .json({ success: false, message: "无效的商品数据" });
    }

    // 先清空再插入
    await supabase.from("products").delete().neq("id", "0");

    for (const product of products) {
      const { error } = await supabase.from("products").insert([
        {
          id: String(product.id),
          name: product.name,
          price: product.price,
          unit: product.unit || "斤",
          image: product.image,
          seller: product.seller,
          badge: product.badge,
          address: product.address,
          description: product.description,
          stock: product.stock || 0,
          is_certified: product.isCertified || false,
          images: product.images || [],
          sales_count: product.salesCount || 0,
          good_rate: product.goodRate || 100,
          review_count: product.reviewCount || 0,
          trace_code: product.traceCode || null,
        },
      ]);
      if (error) console.error("商品插入失败:", error);
    }

    res.json({ success: true, message: `已同步 ${products.length} 个商品` });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 添加单个商品
app.post("/api/products", async (req, res) => {
  try {
    const product = req.body;
    const { error } = await supabase.from("products").insert([
      {
        id: String(product.id),
        name: product.name,
        price: product.price,
        unit: product.unit || "斤",
        image: product.image,
        seller: product.seller,
        badge: product.badge,
        address: product.address,
        description: product.description,
        stock: product.stock || 0,
        is_certified: product.isCertified || false,
        images: product.images || [],
        sales_count: 0,
        good_rate: 100,
        review_count: 0,
      },
    ]);
    if (error) throw error;
    res.json({ success: true, message: "商品添加成功" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 删除商品
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true, message: "商品已删除" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ==================== 订单管理 API ====================

// 获取所有订单
app.get("/api/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.json({ success: false, data: [], message: error.message });
  }
});

// 创建订单
app.post("/api/orders", async (req, res) => {
  try {
    const order = req.body;
    const { error } = await supabase.from("orders").insert([order]);
    if (error) throw error;
    res.json({ success: true, message: "订单创建成功" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// 更新订单状态
app.put("/api/orders/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const { error } = await supabase
      .from("orders")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true, message: "订单状态已更新" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ==================== 统计数据 API ====================

app.get("/api/statistics", async (req, res) => {
  try {
    const [usersRes, productsRes, ordersRes, merchantAppsRes] =
      await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase
          .from("merchant_applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

    res.json({
      success: true,
      data: {
        totalUsers: usersRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        pendingApplications: merchantAppsRes.count || 0,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
