// 3d Graph.cpp : This file contains the 'main' function. Program execution begins and ends there.
//

#include <iostream>
#include <cstdio>
#include <cmath>
#include <vector>
using namespace std;

short NUMS[256*256] = {};

int main(int argc, char* argv[])
{
    for (int i = 0; i < 256 * 256; i++) {
        NUMS[i] = i-32768;
    }

    return 0;
}
