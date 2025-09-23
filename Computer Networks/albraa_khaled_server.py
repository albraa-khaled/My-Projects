import socket
import random

def Detect_error(packet):
    checksum = sum(packet[:-2])
    return checksum.to_bytes(2, byteorder='big') == packet[-2:]

def Random_bit_error(packet):
    bit_to_flip = random.randint(0, len(packet) * 8 - 1)
    byte_index = bit_to_flip // 8
    bit_index = bit_to_flip % 8
    packet[byte_index] ^= (1 << bit_index)

def server():
    server_ip = '127.0.0.1'
    server_port = 12345

    server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_socket.bind((server_ip, server_port))

    while True:
        packet, client_addr = server_socket.recvfrom(1024)
        packet = bytearray(packet)
        Random_bit_error(packet)
        if Detect_error(packet):
            print("Checksum is calculated, and no error is detected")
            seq_number = packet[0]
            if seq_number == 0:
                ack_packet = b'ACK'
            else:
                ack_packet = b'ACK'
        else:
            print("Checksum is calculated, and an error is detected")
            ack_packet = b'NAK'
        server_socket.sendto(ack_packet, client_addr)

    server_socket.close()

if __name__ == "__main__":
    server()
