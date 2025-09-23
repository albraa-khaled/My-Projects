import csv
import random


base_transactions = [
    ['phone case', 'screen protector'],
    ['laptop charger', 'USB cable', 'wireless mouse', 'keyboard'],
    ['phone case', 'USB cable', 'power bank', 'headphones'],
    ['screen protector', 'laptop charger', 'wireless mouse', 'phone stand'],
    ['phone case', 'screen protector', 'power bank', 'headphones']
]


def generate_large_dataset(base_transactions, num_transactions):
    items = [
    'phone case', 'screen protector', 'laptop charger', 'USB cable', 'wireless mouse',
    'keyboard', 'power bank', 'headphones', 'phone stand', 'tablet cover', 'Bluetooth speaker', 'webcam'
]
    dataset = []

    for _ in range(num_transactions):
        
        transaction = random.choice(base_transactions).copy()
        
        if random.random() < 0.5:
            
            item_to_add = random.choice(items)
            if item_to_add not in transaction:
                transaction.append(item_to_add)
        else:
            
            if len(transaction) > 1:
                transaction.remove(random.choice(transaction))

        dataset.append(transaction)

    return dataset


num_transactions = 1000  
large_dataset = generate_large_dataset(base_transactions, num_transactions)

#where you want to save the generated dataset
file_path = r'D:\univer\data mining\sales\large_sales1.csv'
with open(file_path, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(['TransactionID', 'Item1', 'Item2', 'Item3', 'Item4', 'Item5'])  # Adjust header based on max items

    for i, transaction in enumerate(large_dataset):
        row = [i + 1] + transaction + [''] * (5 - len(transaction))  # Ensure all rows have the same number of columns
        writer.writerow(row)

print(f"Generated dataset with {num_transactions} transactions and saved to {file_path}")
