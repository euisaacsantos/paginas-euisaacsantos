"""
Wrapper para a Meta Graph API v21.0.
Uso direto: python scripts/meta_api.py --account ACT_ID --action insights
"""
import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta
import urllib.request
import urllib.parse

ROOT = Path(__file__).parent.parent

def load_env():
    env_file = ROOT / '.env'
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

load_env()

GRAPH = 'https://graph.facebook.com/v21.0'
TOKEN = os.getenv('META_ADS_ACCESS_TOKEN', '')
DEFAULT_ACCOUNT = os.getenv('META_ADS_ACCOUNT_ID', '')


def _get(path, params=None):
    p = {'access_token': TOKEN}
    if params:
        p.update(params)
    url = f"{GRAPH}/{path}?{urllib.parse.urlencode(p)}"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    if 'error' in data:
        raise RuntimeError(f"Meta API error: {data['error'].get('message', data['error'])}")
    return data


def get_account_info(account_id=None):
    acct = f"act_{account_id or DEFAULT_ACCOUNT}"
    return _get(acct, {
        'fields': 'id,name,account_status,currency,timezone_name,spend_cap,amount_spent'
    })


def get_campaigns(account_id=None, limit=100):
    acct = f"act_{account_id or DEFAULT_ACCOUNT}"
    return _get(f"{acct}/campaigns", {
        'fields': 'id,name,status,effective_status,daily_budget,lifetime_budget,objective',
        'limit': limit
    }).get('data', [])


def get_insights(account_id=None, date_preset='last_7d', level='account'):
    acct = f"act_{account_id or DEFAULT_ACCOUNT}"
    fields = 'spend,impressions,clicks,cpm,ctr,actions,cost_per_action_type,reach,frequency'
    if level != 'account':
        fields = f'campaign_name,adset_name,{fields}'
    data = _get(f"{acct}/insights", {
        'fields': fields,
        'date_preset': date_preset,
        'level': level,
        'limit': 100
    })
    return data.get('data', [])


def get_adsets(campaign_id, limit=100):
    return _get(f"{campaign_id}/adsets", {
        'fields': 'id,name,status,effective_status,daily_budget,targeting,optimization_goal',
        'limit': limit
    }).get('data', [])


def get_ads(adset_id, limit=100):
    return _get(f"{adset_id}/ads", {
        'fields': 'id,name,status,effective_status,creative{thumbnail_url,body,title}',
        'limit': limit
    }).get('data', [])


def pause_object(object_id):
    """Pausa campanha, conjunto ou anúncio."""
    import urllib.request
    data = urllib.parse.urlencode({
        'status': 'PAUSED',
        'access_token': TOKEN
    }).encode()
    req = urllib.request.Request(f"{GRAPH}/{object_id}", data=data, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def resume_object(object_id):
    """Ativa campanha, conjunto ou anúncio."""
    import urllib.request
    data = urllib.parse.urlencode({
        'status': 'ACTIVE',
        'access_token': TOKEN
    }).encode()
    req = urllib.request.Request(f"{GRAPH}/{object_id}", data=data, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def get_account_health(account_id=None):
    """Resumo rápido de saúde da conta — usado pelo /vigia-24h."""
    info = get_account_info(account_id)
    insights_7d = get_insights(account_id, date_preset='last_7d')
    insights_today = get_insights(account_id, date_preset='today')

    row_7d = insights_7d[0] if insights_7d else {}
    row_today = insights_today[0] if insights_today else {}

    def actions_map(row):
        result = {}
        for a in row.get('actions', []):
            result[a['action_type']] = float(a['value'])
        return result

    acts_7d = actions_map(row_7d)
    acts_today = actions_map(row_today)

    return {
        'account': info,
        'last_7d': {
            'spend': float(row_7d.get('spend', 0)),
            'impressions': int(row_7d.get('impressions', 0)),
            'clicks': int(row_7d.get('clicks', 0)),
            'ctr': float(row_7d.get('ctr', 0)),
            'cpm': float(row_7d.get('cpm', 0)),
            'purchases': acts_7d.get('purchase', acts_7d.get('offsite_conversion.fb_pixel_purchase', 0)),
        },
        'today': {
            'spend': float(row_today.get('spend', 0)),
            'impressions': int(row_today.get('impressions', 0)),
            'purchases': acts_today.get('purchase', acts_today.get('offsite_conversion.fb_pixel_purchase', 0)),
        }
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--account', default=DEFAULT_ACCOUNT)
    parser.add_argument('--action', choices=['info', 'insights', 'campaigns', 'health'], default='health')
    parser.add_argument('--preset', default='last_7d')
    args = parser.parse_args()

    if args.action == 'info':
        print(json.dumps(get_account_info(args.account), indent=2, ensure_ascii=False))
    elif args.action == 'insights':
        print(json.dumps(get_insights(args.account, args.preset), indent=2, ensure_ascii=False))
    elif args.action == 'campaigns':
        print(json.dumps(get_campaigns(args.account), indent=2, ensure_ascii=False))
    elif args.action == 'health':
        print(json.dumps(get_account_health(args.account), indent=2, ensure_ascii=False))
