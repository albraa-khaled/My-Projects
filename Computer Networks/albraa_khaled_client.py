import socket
import random

def Checksum(data):
    checksum = sum(data)
    return checksum.to_bytes(2, byteorder='big')

def Random_bit_error(packet):
    bit_to_flip = random.randint(0, len(packet) * 8 - 1)
    byte_index = bit_to_flip // 8
    bit_index = bit_to_flip % 8
    packet[byte_index] ^= (1 << bit_index)

def client():
    server_ip = '127.0.0.1'
    server_port = 12345
    seq_number = 0

    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    while True:
        data = input("Enter a character: ")
        if not data:
            break
        packet = bytearray([seq_number]) + bytearray(data.encode('utf-8'))
        packet += Checksum(packet)
        Random_bit_error(packet)
        client_socket.sendto(bytes(packet), (server_ip, server_port))
        print("Packet sent with sequence number:", seq_number)
        ack, _ = client_socket.recvfrom(1024)
        if ack == b'ACK':
            print("Received ACK")
            seq_number = (seq_number + 1) % 2
        elif ack == b'NAK':
            print("Received NAK, retransmitting packet")
            continue

    client_socket.close()

if __name__ == "__main__":
    client()
