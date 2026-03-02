import pytest

from utils.input_normalizers import normalizar_telefono


def test_normalizar_telefono_limpia_unicode_invisible():
    telefono = "\u202a+352\xa0661\xa0280\xa0008\u202c"
    assert normalizar_telefono(telefono) == "+352661280008"


def test_normalizar_telefono_permite_nulo():
    assert normalizar_telefono(None) is None
    assert normalizar_telefono("   ") is None


def test_normalizar_telefono_rechaza_muy_largo():
    with pytest.raises(ValueError, match="supera el m[aá]ximo"):
        normalizar_telefono("+" + "1" * 80)
