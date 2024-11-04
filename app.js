const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Oneofus0548!', 
    database: 'XplosiveElectronics' 
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// callcenter.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'callcenter.html'));
});

// Search customer by name or phone
app.get('/searchCustomer', (req, res) => {
    const searchQuery = req.query.query;
    const sql = `SELECT * FROM customer WHERE Name LIKE ? OR Phone LIKE ?`;
    const queryValues = [`%${searchQuery}%`, `%${searchQuery}%`];

    db.query(sql, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json('Error fetching customer data');
        }
        res.json(results);
    });
});

// Search product by name
app.get('/searchProduct', (req, res) => {
    const searchQuery = req.query.query;
    const sql = `SELECT * FROM product WHERE Name LIKE ?`;
    const queryValues = [`%${searchQuery}%`];

    db.query(sql, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json('Error fetching product data');
        }
        res.json(results);
    });
});

// Place an order
app.post('/order', (req, res) => {
    const { customerId, items, paymentMethod, cardDetails } = req.body;


    // Default Payment_ID to 1 for non-credit payments
    let paymentId = 1;

    // Function to insert the order once we have the paymentId
    const addOrder = () => {
        const orderSql = `
            INSERT INTO orders (Customer_ID, Payment_ID, Order_Type, Order_Date)
            VALUES (?, ?, 'Online', NOW())
        `;
        db.query(orderSql, [customerId, paymentId], (err, result) => {
            if (err) {
                console.error('Error inserting into orders table:', err);
                return res.status(500).json('Error placing order');
            }
            const orderId = result.insertId;
            console.log('Order inserted with ID:', orderId);

            // Insert each item into the order_detail table using a promise chain
            const orderDetailPromises = items.map(item => {
                return new Promise((resolve, reject) => {
                    const orderDetailSql = `
                        INSERT INTO order_detail (Order_ID, Product_ID, Quantity, Price)
                        VALUES (?, ?, ?, ?)
                    `;

                    const totalItemPrice = (item.quantity * item.price)*1.07;
                    db.query(orderDetailSql, [orderId, item.productId, item.quantity, totalItemPrice], (err) => {
                        if (err) {
                            console.error('Error inserting into order_detail table:', err);
                            reject('Error saving order details');
                        } else {
                            resolve();
                        }
                    });
                });
            });

            // Resolve all promises and then send the final response
            Promise.all(orderDetailPromises)
                .then(() => {
                    res.json('Order placed successfully');
                })
                .catch(error => {
                    res.status(500).json(error);
                });
        });
    };

    // Handle payment insertion if method is card
    console.log("Payment Method:", paymentMethod);
    if (paymentMethod === 'Credit Card') {
        console.log("Inserting payment for credit card...");
    
        // Convert MM/YY to YYYY-MM-DD format using template literals
        const [month, year] = cardDetails.expirationDate.split('/');
        const formattedExpirationDate = `20${year}-${month}-01`;  // Set day to 01 for simplicity
    
        console.log("Card Number:", cardDetails.cardNumber);
        console.log("Formatted Expiration Date:", formattedExpirationDate);
        console.log("Customer ID:", customerId);
    
        const paymentSql = `
            INSERT INTO payment (Payment_Type, Card_Number, Expiration_Date, Customer_ID)
            VALUES ('Credit Card', ?, ?, ?)
        `;
        db.query(paymentSql, [
            cardDetails.cardNumber,         // This should match the second placeholder (?)
            formattedExpirationDate,        // This should match the third placeholder (?)
            customerId                      // This should match the fourth placeholder (?)
        ], (err, result) => {
            if (err) {
                console.error('Error inserting into payment table:', err);
                return res.status(500).json({ error: 'Error saving payment details' });
            }
            paymentId = result.insertId;
            console.log('Payment inserted with ID:', paymentId);
            addOrder(); // Proceed to insert the order with the new paymentId
        });
    } else {
        // If payment method is not credit, proceed with paymentId = 1
        addOrder();
    }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


