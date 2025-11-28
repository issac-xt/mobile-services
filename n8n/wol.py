#!/usr/bin/env python3
import socket
import sys

def send_magic_packet(mac):
    # Normalize MAC
    mac = mac.replace(":", "").replace("-", "").lower()
    if len(mac) != 12:
        raise ValueError("Invalid MAC address")

    # Build magic packet
    packet = bytes.fromhex("ff" * 6 + mac * 16)

    # Create a broadcast UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

    # Broadcast to the LAN
    sock.sendto(packet, ("192.168.29.255", 9))
    sock.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 wol.py <mac-address>")
        sys.exit(1)

    mac = sys.argv[1]
    send_magic_packet(mac)
    print(f"Magic packet sent to {mac}")