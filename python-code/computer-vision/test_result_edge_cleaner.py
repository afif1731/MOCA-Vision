import re
import os

def proses_banyak_file(daftar_file):
    for file_input in daftar_file:
        direktori = os.path.dirname(file_input)
        nama_file = os.path.basename(file_input)
        
        nama_file_output = "clean_" + nama_file
        file_output = os.path.join(direktori, nama_file_output)
        
        try:
            with open(file_input, 'r') as infile, open(file_output, 'w') as outfile:
                for line in infile:
                    number_found = re.findall(r'\d+(?:\.\d+)?', line)
                    
                    if number_found:
                        formatted_number = [line_number.replace('.', ',') for line_number in number_found]
                        newline = '\t'.join(formatted_number)
                        outfile.write(newline + '\n')
            
            print(f"Berhasil: '{file_input}' telah diproses dan disimpan sebagai '{file_output}'")
            
        except FileNotFoundError:
            print(f"Gagal: File '{file_input}' tidak ditemukan. Melewati file ini...")
        except Exception as e:
            print(f"Terjadi kesalahan pada '{file_input}': {e}")


array_file_input = [
    "./_test_result/cloud/process_time_cloud_ai_05.txt",
    "./_test_result/cloud/process_time_cloud_edge_05.txt",
]

proses_banyak_file(array_file_input)