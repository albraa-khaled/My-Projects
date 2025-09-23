import csv

def load_dataset_from_csv(file_path):
    dataset = []
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        csvreader = csv.reader(csvfile)
        for row in csvreader:
            # Skip the header row
            if csvreader.line_num == 1:
                continue
            # Append the items, excluding empty strings
            dataset.append([item for item in row[1:] if item])
    return dataset

def create_candidates(dataset):
    C1 = []
    for transaction in dataset:
        for item in transaction:
            if not [item] in C1:
                C1.append([item])
    C1.sort()
    return list(map(frozenset, C1))

def scan_dataset(dataset, candidates, min_support):
    sscnt = {}
    for tid in dataset:
        for can in candidates:
            if can.issubset(tid):
                if not can in sscnt:
                    sscnt[can] = 1
                else:
                    sscnt[can] += 1
    num_items = float(len(dataset))
    ret_list = []
    support_data = {}
    for key in sscnt:
        support = sscnt[key] / num_items
        if support >= min_support:
            ret_list.insert(0, key)
        support_data[key] = support
    return ret_list, support_data

def apriori_gen(frequent_itemsets, k):
    ret_list = []
    len_freq_sets = len(frequent_itemsets)
    for i in range(len_freq_sets):
        for j in range(i + 1, len_freq_sets):
            L1 = list(frequent_itemsets[i])[:k-2]
            L2 = list(frequent_itemsets[j])[:k-2]
            L1.sort()
            L2.sort()
            if L1 == L2:
                ret_list.append(frequent_itemsets[i] | frequent_itemsets[j])
    return ret_list

def apriori(dataset, min_support=0.5, max_scans=None):
    C1 = create_candidates(dataset)
    D = list(map(set, dataset))
    L1, support_data = scan_dataset(D, C1, min_support)
    L = [L1]
    k = 2
    scans = 1

    print(f"Scan {scans}:")
    print(f"Candidates: {C1}")
    print(f"Frequent Itemsets: {L1}\n")

    while len(L[k-2]) > 0:
        if max_scans and scans >= max_scans:
            break
        Ck = apriori_gen(L[k-2], k)
        Lk, supK = scan_dataset(D, Ck, min_support)
        support_data.update(supK)
        L.append(Lk)

        scans += 1
        print(f"Scan {scans}:")
        print(f"Candidates: {Ck}")
        print(f"Frequent Itemsets: {Lk}\n")

        k += 1

    return L, support_data

#import the dataset file path here
file_path = r'D:\univer\data mining\sales\large_sales1.csv'  
dataset = load_dataset_from_csv(file_path)
max_scans = 3  # Set the desired number of scans
L, support_data = apriori(dataset, min_support=0.4, max_scans=max_scans)#change the number of min_support if you want

print(f"Results after {max_scans} scans:")
print("Frequent Itemsets:")
for l in L:
    if len(l) > 0:
        print([list(item) for item in l if item])  # Ensure empty items are not printed
print("\nSupport Data:")
for key, value in support_data.items():
    if key:
        print(f"{list(key)}: {value}")
