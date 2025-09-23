from tkinter import *
from tkinter import filedialog
from PIL import Image,ImageTk


def open_image():
    file_path = filedialog.askopenfilename()
    if file_path: 
        global org_image    
        org_image= Image.open(file_path)
        org_image.thumbnail((300, 300))  # Resize the image if necessary
        photo = ImageTk.PhotoImage(org_image)
        label.config(image=photo)
        label.image = photo  # Keep a reference to avoid garbage collection
        header.pack()
        button0.pack()
    return org_image


def apply_erosion(image_data1):
    kernel = [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0]
    ]
    global image_width,image_height
    # Get dimensions of the image and kernel
    
    image_height, image_width = len(image_data1), len(image_data1[0])
    kernel_height, kernel_width = len(kernel), len(kernel[0])
    
    # Calculate padding required for the input image
    padding_height = kernel_height // 2
    padding_width = kernel_width // 2
    
    # Pad the image with zeros
    padded_image = [[0] * (image_width + 2 * padding_width) for _ in range(image_height + 2 * padding_height)]
    for i in range(image_height):
        for j in range(image_width):
            padded_image[i + padding_height][j + padding_width] = image_data1[i][j]
    
    # Create an output image
    global output_image
    output_image = [[0] * image_width for _ in range(image_height)]
    
    # Apply erosion
    for i in range(image_height):
        for j in range(image_width):
            min_value = 255  # Initialize with maximum possible value
            for ki in range(kernel_height):
                for kj in range(kernel_width):
                    if kernel[ki][kj] == 1:
                        min_value = min(min_value, padded_image[i + ki][j + kj])
            output_image[i][j] = min_value
    return output_image

def apply_dilation(image_data1):
    kernel = [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0]
    ]
    
    

    # Get dimensions of the image and kernel
    kernel_height, kernel_width = len(kernel), len(kernel[0])
    
    # Create an output image
    output_image = [[0] * image_width for _ in range(image_height)]
    
    # Apply dilation
    for i in range(image_height):
        for j in range(image_width):
            max_value = 0  # Initialize with minimum possible value
            for ki in range(kernel_height):
                for kj in range(kernel_width):
                    if i + ki < image_height and j + kj < image_width:  # Check if within bounds
                        if kernel[ki][kj] == 1:
                            max_value = max(max_value, image_data1[i + ki][j + kj])
            output_image[i][j] = max_value


    return output_image


def converter_before():
    bw_image = org_image.convert("L")
    image_data = list(bw_image.getdata())
    global image_width,image_height
    image_width, image_height = bw_image.size
    global image_data0
    image_data0 = [image_data[i * image_width:(i + 1) * image_width] for i in range(image_height)]

def converter_after(processed_image):
    global original_photo, processed_photo
    
    # Convert the eroded image data into a format suitable for Image.putdata()
    processed_data = [pixel for row in processed_image for pixel in row]
    
    # Create PhotoImage objects from the original and eroded image data
    original_photo = ImageTk.PhotoImage(org_image)
    processed_image_temp = Image.new("L", (image_width, image_height))
    processed_image_temp.putdata(processed_data)
    processed_photo = ImageTk.PhotoImage(processed_image_temp)
    

    

def techniques():
    label1.pack()
    button1.pack(side="left",padx=10)
    button2.pack(side="left",padx=10)
    button3.pack(side="left",padx=10)
    button4.pack(side="left",padx=10)

def call_erosion():
    global eroded_image
    converter_before()
    eroded_image=apply_erosion(image_data0)
    converter_after(eroded_image)
    original_label.config(image=original_photo)
    processed_label.config(image=processed_photo)
    
def call_dilation():
    global dilated_image
    converter_before()
    dilated_image=apply_dilation(image_data0)
    converter_after(dilated_image)
    original_label.config(image=original_photo)
    processed_label.config(image=processed_photo)

def call_opening():
    global opened_image
    converter_before()
    opened_image=apply_erosion(image_data0)
    opened_image=apply_dilation(opened_image)
    converter_after(opened_image)
    original_label.config(image=original_photo)
    processed_label.config(image=processed_photo)

def call_closing():
    global closed_image
    converter_before()
    closed_image=apply_dilation(image_data0)
    closed_image=apply_erosion(closed_image)
    converter_after(closed_image)
    original_label.config(image=original_photo)
    processed_label.config(image=processed_photo)




root=Tk()
root.title('image algorithms')
root.geometry('800x800')


header=Label(root,text='Your Image')
label1=Label(root,text="chose the technique ")
button=Button(root,text="uplode image",width=20,command=open_image)

button0 = Button(root, text="apply techniques", width=20,command=techniques)
button1 = Button(root, text="erosion",command=call_erosion)
button2 = Button(root, text="dilatin",command=call_dilation)
button3 = Button(root, text="opening",command=call_opening)
button4 = Button(root, text="closing",command=call_closing)

label = Label(root)
original_label = Label(root)
processed_label = Label(root)
button.pack(pady=10)
label.pack()
original_label.pack(side="left")
processed_label.pack(side="left")
root.mainloop()
