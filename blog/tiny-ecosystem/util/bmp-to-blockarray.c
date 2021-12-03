#define STB_IMAGE_IMPLEMENTATION

#include "stb_image.h"

#include <stdio.h>
#include <stdlib.h>

int main(int argc, char* argv[]) {
    if (argc != 2) {
        printf("ERR. Invalid number of args.\n");
        return 1;
    }

    int width;
    int height;
    int channels;
    unsigned char* pixels = stbi_load(argv[1], &width, &height, &channels, 0);

    if (pixels == NULL) {
        printf("ERR. Couldn't load file.\n");
        return 2;
    }

    printf("Loaded image as %dx%d with %d channels.\n", width, height, channels);

    for (int i = 0; i < 3*width*height; i+=3) {
        int pixnum = i;

        int r = pixels[pixnum+0] > 128;
        int g = pixels[pixnum+1] > 128;
        int b = pixels[pixnum+2] > 128;
        // printf("pix[%d] = %d (%d,%d,%d)\n", pixnum, pix, r,g,b);
        
        if (r) {
            printf("r");
        } else if (g) {
            printf("g");
        } else if (b) {
            printf("w");
        } else {
            printf("d");
        }
    }
    printf("\n");

    free(pixels);
    return 0;
}
