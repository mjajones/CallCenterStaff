let selectedCustomer = null;
let selectedProducts = [];

// Remove selected customer
function removeCustomer() {
    selectedCustomer = null;
    displaySelectedCustomer();
}

// Display selected customer
function displaySelectedCustomer() {
    const customerInfo = selectedCustomer
        ? `Customer: ${selectedCustomer.Name}, Phone: ${selectedCustomer.Phone}`
        : 'None';
    document.getElementById('selected-customer-info').textContent = customerInfo;
}

// Display selected products
function displaySelectedProducts() {
    const productList = document.getElementById('selected-products-list');
    productList.innerHTML = ''; // Clear the list

    selectedProducts.forEach((product, index) => {
        const li = document.createElement('li');
        li.textContent = `${product.name} - $${product.price.toFixed(2)} x ${product.quantity}`;
        li.addEventListener('click', () => removeProduct(index));
        productList.appendChild(li);
    });

    updateTotal();
}

// Update total and total with tax
function updateTotal() {
    const totalPrice = selectedProducts.reduce((total, product) => total + product.price * product.quantity, 0);
    const totalWithTax = totalPrice * 1.07;

    document.getElementById('total-price').textContent = totalPrice.toFixed(2);
    document.getElementById('total-with-tax').textContent = totalWithTax.toFixed(2);
}

// Remove product by index
function removeProduct(index) {
    selectedProducts.splice(index, 1);
    displaySelectedProducts();
}

// Search customer
document.getElementById('customer-search-btn').addEventListener('click', () => {
    const searchQuery = document.getElementById('customer-search').value;

    fetch(`/searchCustomer?query=${searchQuery}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(customers => {
            const resultDiv = document.getElementById('customer-results');
            resultDiv.innerHTML = '';

            if (customers.length === 0) {
                const p = document.createElement('p');
                p.textContent = 'No customers found.';
                resultDiv.appendChild(p);
            } else {
                customers.forEach((customer) => {
                    const p = document.createElement('p');
                    p.textContent = `Customer: ${customer.Name}, Phone: ${customer.Phone}`;
                    p.addEventListener('click', () => {
                        selectedCustomer = customer;
                        displaySelectedCustomer();
                    });
                    resultDiv.appendChild(p);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching customer data:', error);
        });
});

// Search product
document.getElementById('product-search-btn').addEventListener('click', () => {
    const searchQuery = document.getElementById('product-search').value;

    fetch(`/searchProduct?query=${searchQuery}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(products => {
            const resultDiv = document.getElementById('product-results');
            resultDiv.innerHTML = '';

            if (products.length === 0) {
                const p = document.createElement('p');
                p.textContent = 'No products found.';
                resultDiv.appendChild(p);
            } else {
                products.forEach(product => {
                    const p = document.createElement('p');
                    p.textContent = `Product: ${product.Name}, Price: $${product.Price}`;
                    p.addEventListener('click', () => {
                        const quantity = prompt("Enter quantity:", "1");
                        selectedProducts.push({
                            id: product.Product_ID, // Use Product_ID for backend reference
                            name: product.Name,
                            price: parseFloat(product.Price),
                            quantity: parseInt(quantity) || 1 // Default to 1 if input is invalid
                        });
                        displaySelectedProducts();
                    });
                    resultDiv.appendChild(p);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching product data:', error);
        });
});

document.addEventListener('DOMContentLoaded', () => {
    // Handle payment method change
    document.getElementById('payment-method').addEventListener('change', (event) => {
        const cardInfoDiv = document.getElementById('card-info');
        if (event.target.value === 'card') {
            cardInfoDiv.style.display = 'block';
        } else {
            cardInfoDiv.style.display = 'none';
        }
    });

    // Place Order Button
    document.getElementById('place-order-btn').addEventListener('click', () => {
        if (!selectedCustomer || selectedProducts.length === 0) {
            alert('Please select a customer and at least one product before placing the order.');
            return;
        }
    
        const cardNumber = document.getElementById('card-number').value;
        const expirationDate = document.getElementById('card-expiry').value;
        const cvv = document.getElementById('card-cvv').value;
        const paymentMethod = document.getElementById('payment-method').value === 'card' ? 'Credit Card' : 'Other';
    
        // Ensure card details are provided if payment method is card
        if (paymentMethod === 'Credit Card' && (!cardNumber || !expirationDate || !cvv)) {
            alert('Please enter card details.');
            return;
        }
    
        // Construct the order data for the backend
        const orderData = {
            customerId: selectedCustomer.Customer_ID,
            items: selectedProducts.map(product => ({
                productId: product.id,
                quantity: product.quantity,
                price: product.price  // Include price here
            })),
            paymentMethod,
            cardDetails: paymentMethod === 'Credit Card' ? { cardNumber, expirationDate, cvv } : null
        };
    
        // Send order data to the server
        fetch('/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        })
        .then(response => response.json())
        .then(data => {
            alert('Order placed successfully!');
            console.log('Order response:', data);
    
            // Reset selected items and customer after successful order
            selectedCustomer = null;
            selectedProducts = [];
            displaySelectedCustomer();
            displaySelectedProducts();
            updateTotal();
    
            // Clear input fields
            setTimeout(() => {
                document.getElementById('card-number').value = '';
                document.getElementById('card-expiry').value = '';
                document.getElementById('card-cvv').value = '';
                document.getElementById('payment-method').selectedIndex = 0;
                document.getElementById('customer-results').innerHTML = '';
                document.getElementById('product-results').innerHTML = '';
                document.getElementById('customer-search').value = '';
                document.getElementById('product-search').value = '';
            }, 100);
        })
        .catch(error => {
            console.error('Error placing order:', error);
            alert('There was an error placing the order. Please try again.');
        });
    });
});