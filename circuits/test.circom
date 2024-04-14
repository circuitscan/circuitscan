pragma circom 2.0.0;

template ExampleTemplate(a, b, c) {
    signal input x, y[10], z, w[a * 2 / b];
    signal output out;

    out <== x * y[0] + a * b + c;
}
