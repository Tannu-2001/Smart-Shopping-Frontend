
/* eslint-disable no-unused-vars */
/* global $ */

$(function () {

  // Helper: current user id
  function getCurrentUserId() {
    return $.cookie('userid') || null;
  }

  async function sanitizeCart() {
  try {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    // normalize to strings
    cart = cart.map(it => ({ id: String(it.id), qty: Number(it.qty) || 1 }));

    // fetch products once
    const resp = await fetch('https://smart-shopping-backend-89qf.onrender.com/getproducts');
    if (!resp.ok) {
      console.warn('sanitizeCart: getproducts returned', resp.status);
      return; // don't change cart if products endpoint not available
    }
    const products = await resp.json();

    // valid id set from server (both id and _id)
    const valid = new Set();
    products.forEach(p => {
      if (p.id !== undefined) valid.add(String(p.id));
      if (p._id !== undefined) valid.add(String(p._id));
    });

    // filter cart
    const filtered = cart.filter(it => valid.has(String(it.id)));

    if (filtered.length !== cart.length) {
      console.info('sanitizeCart: removed invalid cart items', cart.map(c=>c.id).filter(id=>!filtered.find(f=>f.id===id)));
      localStorage.setItem('cart', JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('sanitizeCart error (ignored):', err);
  }
}

// call sanitize early (document ready)
sanitizeCart().then(() => {
  try { if (typeof updateCartCount === 'function') updateCartCount(); } catch(e){ /* empty */ }
});
  

  // Save both session cart and per-user cart (if logged in)
  function saveCartToLocalAndUser(cart) {
    try {
      const arr = cart || [];
      localStorage.setItem('cart', JSON.stringify(arr));
      const uid = getCurrentUserId();
      if (uid) {
        localStorage.setItem(`cart_${uid}`, JSON.stringify(arr));
      }
    } catch (e) {
      console.warn("saveCartToLocalAndUser error", e);
    }
  }

  // Load cart for current user (prefer per-user if logged in)
  function loadCartForCurrentUser() {
    try {
      const uid = getCurrentUserId();
      if (uid) {
        const per = localStorage.getItem(`cart_${uid}`);
        if (per) {
          return JSON.parse(per || '[]');
        }
      }
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
      console.warn("loadCartForCurrentUser error", e);
      return [];
    }
  }

  // update cart count UI
  function updateCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      let total = 0;
      if (Array.isArray(cart)) {
        total = cart.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      }
      if ($('#cartCount').length) {
        $('#cartCount').text(total);
      }
      if ($('#btnCart').length && !$('#cartCount').length) {
        $('#btnCart').text(`Cart(${total})`);
      }
      console.log('Cart count:', total);
    } catch (err) {
      console.error('updateCartCount error', err);
      if ($('#cartCount').length) $('#cartCount').text(0);
    }
  }

  // ---------------- Register nav ----------------
  $("#btnNavRegister").off("click").on("click", function () {
    $.ajax({ method: "GET", url: "register.html" })
      .then(function (response) {
        $("#bodyContainer").html(response);

        $("#btnRegister").off("click").on("click", function () {
          const customerData = {
            UserId: $("#UserId").val(),
            FirstName: $("#FirstName").val(),
            LastName: $("#LastName").val(),
            DateOfBirth: $("#DateOfBirth").val(),
            Email: $("#Email").val(),
            Gender: $("#Gender").val(),
            Address: $("#Address").val(),
            PostalCode: $("#PostalCode").val(),
            State: $("#State").val(),
            Country: $("#Country").val(),
            Mobile: $("#Mobile").val(),
            Password: $("#Password").val()
          };

          $.ajax({
            method: "POST",
            url: "https://smart-shopping-backend-89qf.onrender.com/customerregister",
            data: customerData
          }).then(function () {
            alert("Register Successfully..");
            $.ajax({ method: "GET", url: "login.html" })
              .then(function (resp) {
                $("#bodyContainer").html(resp);
              });
          }).catch(function (err) {
            console.error("Register error:", err);
            alert("Registration failed");
          });
        });
      });
  });

  // ---------------- Login helper ----------------
  function UserLogin(onSuccess) {
    $("#btnLogin").off("click").on("click", function () {
      const userdetails = {
        UserId: $("#txtUserId").val(),
        Password: $("#txtPwd").val()
      };

      $.ajax({ method: "GET", url: "https://smart-shopping-backend-89qf.onrender.com/getcustomers" })
        .then(function (response) {
          const userDetails = response.find(u => u.UserId === userdetails.UserId);
          if (userDetails && userDetails.Password === userdetails.Password) {
            // set cookie + UI
            $.cookie('userid', userdetails.UserId, { path: '/' });
            $("#user").html(userdetails.UserId);
            $("#btnSignout").html("Signout");

            // restore per-user cart into session if exists
            try {
              const uid = userdetails.UserId;
              const per = localStorage.getItem(`cart_${uid}`);
              if (per) {
                localStorage.setItem('cart', per);
              }
            } catch (e) {
              console.warn("Restore cart error", e);
            }

            updateCartCount();

            // callback or default behaviour
            if (typeof onSuccess === "function") {
              onSuccess();
            } else {
              $.ajax({ method: "GET", url: "shophome.html" }).then(function (resp) {
                $("#bodyContainer").html(resp);
              });
            }
          } else {
            alert("Invalid Username | Password..");
          }
        })
        .catch(function (err) {
          console.error("Login fetch error:", err);
          alert("Login error");
        });
    });
  }

  // footer nav helper
  $("#navCategoriesFooter").on("click", function(e){
    e.preventDefault();
    $("#btnNavCategories").click();
  });

  // ---------------- Nav login ----------------
  $("#btnNavLogin").off("click").on("click", function () {
    $.ajax({ method: "GET", url: "login.html" })
      .then(function (response) {
        $("#bodyContainer").html(response);
        UserLogin();
      }).catch(function (err) {
        console.error("Load login.html error:", err);
      });
  });

  // ---------------- Signout ----------------
  $("#btnSignout").off("click").on("click", function () {
    const uid = $.cookie('userid') || null;

    // Save current session cart to per-user key before removing cookie
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (uid) localStorage.setItem(`cart_${uid}`, JSON.stringify(cart));
    } catch(e) { /* ignore */ }

    // Remove cookie and clear session cart
    $.removeCookie('userid', { path: '/' });
    localStorage.removeItem('cart');

    updateCartCount();

    alert("Signed out Successfully");
    $("#user").html("");
    $("#btnSignout").html("Login");
    $.ajax({ method: "GET", url: "login.html" })
      .then(function (resp) {
        $("#bodyContainer").html(resp);
        UserLogin();
      }).catch(function (err) {
        console.error("Load login.html error:", err);
      });
  });

  // ---------------- Shop nav ----------------
  $("#btnNavShopping").off("click").on("click", function () {
    if ($.cookie('userid') === undefined) {
      $.ajax({ method: "GET", url: "login.html" })
        .then(function (response) {
          $("#bodyContainer").html(response);
          UserLogin();
        });
    } else {
      $.ajax({ method: "GET", url: "products.html" })
        .then(function (response) {
          $("#bodyContainer").html(response);
          GetProducts(); // all products
        });
    }
  });

  // ---------------- Categories nav ----------------
  $("#btnNavCategories").off("click").on("click", function () {
    if ($.cookie('userid') === undefined) {
      // not logged in -> show login and after successful login, open categories
      $.ajax({ method: "GET", url: "login.html" })
        .then(function (resp) {
          $("#bodyContainer").html(resp);
          // pass callback to open categories after login
          UserLogin(function () {
            $.ajax({ method: "GET", url: "categories.html" })
              .then(function (resp2) {
                $("#bodyContainer").html(resp2);
                GetCategories();
              });
          });
        });
    } else {
      // logged in -> open categories
      $.ajax({ method: "GET", url: "categories.html" })
        .then(function (resp) {
          $("#bodyContainer").html(resp);
          GetCategories();
        });
    }
  });

  // ---------------- show cart ----------------
  

  function showCart(attempt = 0) {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch(e){ cart = []; }

  if (!cart || cart.length === 0) {
    $("#bodyContainer").html('<div class="p-4"><h4>Your cart is empty</h4></div>');
    return;
  }

  // fetch all products and match locally
  $.ajax({ method: "GET", url: "https://smart-shopping-backend-89qf.onrender.com/getproducts" })
    .then(function (products) {
      // build items list and detect missing products
      const itemsWithProducts = cart.map(ci => {
        const prod = products.find(p =>
          (p.id !== undefined && String(p.id) === String(ci.id)) ||
          (p._id !== undefined && String(p._id) === String(ci.id))
        );
        return { prod, qty: ci.qty || 1, cartId: ci.id };
      });

      // find missing ids
      const missingIds = itemsWithProducts.filter(it => !it.prod).map(it => String(it.cartId));

      if (missingIds.length) {
        console.warn('Missing product in cart - will remove missing ids:', missingIds);

        // remove missing items from local cart
        let newCart = [];
        try { newCart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch(e){ newCart = []; }
        newCart = newCart.filter(it => !missingIds.includes(String(it.id)));
        localStorage.setItem('cart', JSON.stringify(newCart));

        // update cart count UI
        if (typeof updateCartCount === "function") updateCartCount();

        // Only auto-retry once to avoid infinite loops
        if (attempt < 1) {
          // re-run showCart to render updated cart
          return showCart(attempt + 1);
        } else {
          // if still problem after retry, show message to user
          $("#bodyContainer").html('<div class="p-4"><h4>Some items were removed from your cart because they are no longer available.</h4></div>');
          return;
        }
      }

      // all items valid, render
      const validItems = itemsWithProducts.filter(it => it.prod);
      if (validItems.length === 0) {
        $("#bodyContainer").html('<div class="p-4"><h4>No items found (maybe data mismatch)</h4></div>');
        return;
      }

      let html = '<div class="container my-4"><h3>Your Cart</h3><div class="list-group">';
      validItems.forEach(it => {
        const prod = it.prod;
        html += `
          <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${prod.title}</strong><br/>
              <small class="text-muted">${prod.description || ''}</small><br/>
              ₹${prod.price} × ${it.qty}
            </div>
            <div>
              <button class="btn btn-sm btn-outline-secondary btn-decrease" data-id="${it.cartId}">−</button>
              <button class="btn btn-sm btn-outline-secondary btn-increase" data-id="${it.cartId}">+</button>
              <button class="btn btn-sm btn-danger btn-remove" data-id="${it.cartId}">Remove</button>
            </div>
          </div>
        `;
      });
      html += `</div>
        <div class="mt-3">
          <button id="btnCheckout" class="btn btn-primary">Checkout</button>
          <button id="btnContinue" class="btn btn-link">Continue Shopping</button>
        </div>
      </div>`;
      $("#bodyContainer").html(html);

      // handlers
      $(".btn-remove").off("click").on("click", function () {
        const id = $(this).data("id");
        cart = cart.filter(it => String(it.id) !== String(id));
        localStorage.setItem('cart', JSON.stringify(cart));
        if (typeof updateCartCount === "function") updateCartCount();
        showCart();
      });

      $(".btn-increase").off("click").on("click", function () {
        const id = $(this).data("id");
        cart.forEach(it => { if (String(it.id) === String(id)) it.qty = (it.qty || 1) + 1; });
        localStorage.setItem('cart', JSON.stringify(cart));
        if (typeof updateCartCount === "function") updateCartCount();
        showCart();
      });

      $(".btn-decrease").off("click").on("click", function () {
        const id = $(this).data("id");
        cart.forEach(it => { if (String(it.id) === String(id)) it.qty = Math.max(1, (it.qty || 1) - 1); });
        localStorage.setItem('cart', JSON.stringify(cart));
        if (typeof updateCartCount === "function") updateCartCount();
        showCart();
      });

      $("#btnContinue").off("click").on("click", function () {
        $.ajax({ method: "GET", url: "products.html" })
          .then(function (resp) {
            $("#bodyContainer").html(resp);
            GetProducts();
          });
      });

      // Checkout handler (same as before, will use localStorage current cart)
      $("#btnCheckout").off("click").on("click", async function(){
        let currentCart = [];
        try { currentCart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch(e){ currentCart = []; }

        if (!currentCart || currentCart.length === 0) {
          alert("Your cart is empty.");
          return;
        }

        try {
          const productsResp = await $.ajax({ method: "GET", url: "https://smart-shopping-backend-89qf.onrender.com/getproducts" });

          const orderItems = currentCart.map(ci => {
            const prod = productsResp.find(p => String(p.id) === String(ci.id) || String(p._id) === String(ci.id));
            return {
              productId: ci.id,
              title: prod ? prod.title : "",
              unitPrice: prod ? Number(prod.price || 0) : 0,
              qty: ci.qty || 1,
              lineTotal: (prod ? Number(prod.price || 0) : 0) * (ci.qty || 1)
            };
          });

          const missing = orderItems.find(it => it.unitPrice === 0 && !it.title);
          if (missing) {
            alert("Some items in cart are no longer available. Please refresh your cart.");
            // optionally remove missing and refresh UI
            showCart();
            return;
          }

          const subTotal = orderItems.reduce((s, it) => s + it.lineTotal, 0);
          const shipping = 0;
          const tax = 0;
          const grandTotal = subTotal + shipping + tax;

          if (!confirm(`You are about to place an order for ₹${grandTotal}. Proceed?`)) return;

          const payload = {
            userId: $.cookie('userid') || null,
            items: orderItems.map(it => ({ productId: it.productId, qty: it.qty, price: it.unitPrice })),
            subtotal: subTotal,
            shipping: shipping,
            tax: tax,
            total: grandTotal,
            createdAt: new Date().toISOString()
          };

          const createResp = await $.ajax({
            method: "POST",
            url: "https://smart-shopping-backend-89qf.onrender.com/createorder",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType:"json"
          });

          if (createResp && createResp.success) {
            localStorage.removeItem('cart');
            const uid = $.cookie('userid') || null;
            if (uid) localStorage.removeItem(`cart_${uid}`);
            if (typeof updateCartCount === "function") updateCartCount();

            $("#bodyContainer").html(`
              <div class="container my-5">
                <h3>Order Confirmed</h3>
                <p>Order ID: <strong>${createResp.orderId}</strong></p>
                <p>${createResp.message || 'Thank you for your order!'}</p>
                <p>Total Paid: ₹${grandTotal}</p>
                <a href="#" id="btnBackToShop" class="btn btn-primary">Continue Shopping</a>
              </div>
            `);

            $("#btnBackToShop").off("click").on("click", function(e){
              e.preventDefault();
              $.ajax({ method: "GET", url: "products.html" }).then(resp => {
                $("#bodyContainer").html(resp);
                GetProducts();
              });
            });
          } else {
            alert("Unable to create order: " + (createResp && createResp.message ? createResp.message : "Unknown error"));
          }

        } catch (err) {
          console.error("Checkout error:", err);
          alert("Error during checkout. See console for details.");
        }
      });

    })
    .catch(function (err) {
      console.error("Failed to load products for cart:", err);
      $("#bodyContainer").html('<div class="p-4 text-danger">Unable to load cart items</div>');
    });
}



  // attach cart button
  $("#btnCart").off("click").on("click", function (e) {
    e.preventDefault();
    showCart();
  });

  // --- GetProducts (with optional category filter) ---
  function GetProducts(categoryName) {
    const url = categoryName ? `https://smart-shopping-backend-89qf.onrender.com/categories/${encodeURIComponent(categoryName)}` : "https://smart-shopping-backend-89qf.onrender.com/getproducts";
    $.ajax({ method: "GET", url: url })
      .then(function (response) {
        $("#productCatalog").empty();
        $.each(response, function (key, value) {
          const title = value.title || "No title";
          const img = value.image || "";
          const price = value.price ? (`₹${value.price}`) : "";
          // always set idVal as string to avoid number/string mismatch
          const idVal = value.id !== undefined ? String(value.id) : (value._id ? String(value._id) : '');
          const card = $(`
            <div class="card m-2 p-2 product-card" style="width:200px;cursor:pointer;" data-id="${idVal}">
              <img src="${img}" class="card-img-top" height="150" alt="${title}">
              <div class="card-body">
                <h6 class="card-title small">${title}</h6>
                <p class="card-text small text-muted">${price}</p>
              </div>
            </div>
          `);
          $("#productCatalog").append(card);
        });

        $("#productCatalog").off("click", ".product-card").on("click", ".product-card", function () {
          const productId = $(this).data("id");
          if (productId !== undefined) showProductDetails(productId);
        });
      })
      .catch(err => console.error("GetProducts error:", err));
  }

  // GetCategories
  function GetCategories() {
    $.ajax({
      method: "GET",
      url: "https://smart-shopping-backend-89qf.onrender.com/categories"
    })
      .then(function (response) {
        $("#categoryList").empty();
        $.each(response, function (i, cat) {
          const name = cat.CategoryName || cat.category || "Unnamed";
          const card = $(`
            <div class="card p-2 m-2" style="width:180px;cursor:pointer;" data-name="${name}">
              <div class="card-body text-center">
                <h6 class="card-title">${name}</h6>
              </div>
            </div>
          `);
          $("#categoryList").append(card);
        });

        $("#categoryList").off("click", ".card").on("click", ".card", function () {
          const categoryName = $(this).data("name");
          $.ajax({ method: "GET", url: "products.html" })
            .then(function (resp) {
              $("#bodyContainer").html(resp);
              GetProducts(categoryName);
            });
        });
      })
      .catch(err => {
        console.error("GetCategories error:", err);
        $("#categoryList").html('<p class="text-danger">Unable to load categories</p>');
      });
  }

  // Product details (uses GET /getproducts then finds one product)
  function showProductDetails(productId) {
    $.ajax({ method: "GET", url: "https://smart-shopping-backend-89qf.onrender.com/getproducts" })
      .then(function (products) {
        // try to convert numeric strings to number for comparison, otherwise leave as string
        const pid = (typeof productId === "number") ? productId : (isNaN(productId) ? productId : parseInt(productId, 10));
        const product = products.find(p => 
          (p.id !== undefined && String(p.id) === String(productId)) ||
          (p._id !== undefined && (String(p._id) === String(productId)))
        );
        if (!product) { alert("Product not found"); return; }

        const title = product.title || product.name || "Product";
        const image = product.image || product.img || "";
        const price = product.price || product.Price || "";
        const description = product.description || product.desc || "";
        const rating = product.rating !== undefined ? product.rating : (product.rate || 'N/A');
        const category = product.category || product.Category || "-";
        const idVal = product.id !== undefined ? String(product.id) : (product._id ? String(product._id) : '');

        const html = `
          <div class="container my-4">
            <div class="row">
              <div class="col-md-5">
                <img src="${image}" alt="${title}" class="img-fluid rounded" style="max-height:500px; width:100%; object-fit:cover;">
              </div>
              <div class="col-md-7">
                <h2>${title}</h2>
                <h4 class="text-success">${price ? '₹' + price : ''}</h4>
                <p class="text-muted"><strong>Category:</strong> ${category}</p>
                <p>${description}</p>
                <p>
                  <strong>Rating:</strong>
                  <span class="stars" style="--rating: ${Number(rating) || 0}"></span>
                  <span class="rating-value">(${Number(rating)||'NA'})</span>
                </p>
                <div class="mt-3">
                  <button id="btnAddToCart" data-id="${idVal}" class="btn btn-primary me-2">Add to Cart</button>
                  <button id="btnBackToCatalog" class="btn btn-outline-secondary">Back to Catalog</button>
                </div>
              </div>
            </div>
          </div>
        `;
        $("#bodyContainer").html(html);

        $("#btnBackToCatalog").off("click").on("click", function () {
          $.ajax({ method: "GET", url: "products.html" }).then(function (resp) {
            $("#bodyContainer").html(resp);
            GetProducts();
          });
        });

        // Add to cart: update localStorage and (if logged in) save per-user too
        $("#btnAddToCart").off("click").on("click", function () {
          const pid = String($(this).data("id"));   // always string
          let cart = [];
          try { cart = JSON.parse(localStorage.getItem("cart") || "[]"); } catch(e) { cart = []; }

          const existing = cart.find(item => String(item.id) === pid);
          if (existing) {
            existing.qty = (existing.qty || 1) + 1;
          } else {
            cart.push({ id: pid, qty: 1 });
          }

          // save to both session and per-user (if logged in)
          saveCartToLocalAndUser(cart);

          updateCartCount();
          alert("Added to Cart!");
        });

      })
      .catch(err => {
        console.error("showProductDetails error:", err);
        alert("Failed to load product details.");
      });
  }

  // ensure local cart reflects per-user cart on initial load
  try {
    const uid = getCurrentUserId();
    if (uid) {
      const per = localStorage.getItem(`cart_${uid}`);
      if (per) localStorage.setItem('cart', per);
    }
  } catch(e) { /* ignore */ }

  // initial cart count update
  updateCartCount();

  // --- end of ready ---
});


